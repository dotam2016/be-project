import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly TABLE = 'users';
  private readonly OAUTH_TABLE = 'oauth_accounts';
  private readonly RT_TABLE = 'refresh_tokens'; // bảng quản lý phiên đăng nhập

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  // ─── Tìm user theo email ──────────────────────────────
  async findByEmail(email: string) {
    const { data } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('email', email)
      .single();
    return data;
  }

  // ─── Tìm user theo ID ─────────────────────────────────
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('id, email, username, full_name, avatar_url, bio, created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy người dùng');
    return data;
  }

  // ─── Tạo user mới (email/password) ───────────────────
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) throw new ConflictException('Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert([{
        email: createUserDto.email,
        username: createUserDto.username,
        password: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select('id, email, username, created_at')
      .single();

    if (error) throw new ConflictException(error.message);
    return data;
  }

  // ─── Tìm hoặc tạo user từ OAuth ──────────────────────
  async findOrCreateOAuthUser(oauthProfile: {
    provider: string;
    providerId: string;
    email: string;
    username: string;
    avatarUrl?: string;
    accessToken?: string;
  }) {
    const { data: existingOAuth } = await this.supabase
      .from(this.OAUTH_TABLE)
      .select('*, users(*)')
      .eq('provider', oauthProfile.provider)
      .eq('provider_id', oauthProfile.providerId)
      .single();

    if (existingOAuth) {
      await this.supabase
        .from(this.OAUTH_TABLE)
        .update({ access_token: oauthProfile.accessToken, updated_at: new Date().toISOString() })
        .eq('id', existingOAuth.id);
      return existingOAuth.users;
    }

    let user = await this.findByEmail(oauthProfile.email);

    if (!user) {
      const username = await this.generateUniqueUsername(oauthProfile.username);
      const { data: newUser, error } = await this.supabase
        .from(this.TABLE)
        .insert([{
          email: oauthProfile.email,
          username,
          password: null,
          avatar_url: oauthProfile.avatarUrl || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select('*')
        .single();

      if (error) throw new Error('Không thể tạo tài khoản từ OAuth');
      user = newUser;
    }

    await this.supabase
      .from(this.OAUTH_TABLE)
      .insert([{
        user_id: user.id,
        provider: oauthProfile.provider,
        provider_id: oauthProfile.providerId,
        access_token: oauthProfile.accessToken || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

    return user;
  }

  // ─── Cập nhật user ────────────────────────────────────
  async update(id: string, updateUserDto: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({
        full_name: updateUserDto.fullName,
        avatar_url: updateUserDto.avatarUrl,
        bio: updateUserDto.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, email, username, full_name, avatar_url, bio')
      .single();

    if (error || !data) throw new NotFoundException('Cập nhật thất bại');
    return data;
  }

  // ════════════════════════════════════════════════════
  // REFRESH TOKEN — MULTI DEVICE
  // ════════════════════════════════════════════════════

  // ─── Lưu refresh token mới (1 login = 1 record) ───────
  async saveRefreshToken(params: {
    userId: string;
    token: string;
    expiresAt: Date;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { error } = await this.supabase
      .from(this.RT_TABLE)
      .insert([{
        user_id: params.userId,
        token: params.token,
        device_name: params.deviceName || 'Unknown device',
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        expires_at: params.expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      }]);

    if (error) {
      this.logger.error('saveRefreshToken error:', error);
      throw new Error('Không thể lưu phiên đăng nhập');
    }
  }

  // ─── Xác thực refresh token ───────────────────────────
  async validateAndRotateRefreshToken(oldToken: string, newToken: string): Promise<string | null> {
    // Tìm token cũ trong DB
    const { data, error } = await this.supabase
      .from(this.RT_TABLE)
      .select('*')
      .eq('token', oldToken)
      .single();

    if (error || !data) return null;

    // Kiểm tra hết hạn
    if (new Date(data.expires_at) < new Date()) {
      // Xóa token hết hạn
      await this.supabase.from(this.RT_TABLE).delete().eq('id', data.id);
      return null;
    }

    // Xoay vòng token: xóa cũ, lưu mới
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.supabase
      .from(this.RT_TABLE)
      .update({
        token: newToken,
        expires_at: expiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    return data.user_id;
  }

  // ─── Logout 1 thiết bị (xóa đúng token đó) ───────────
  async removeRefreshToken(token: string) {
    await this.supabase
      .from(this.RT_TABLE)
      .delete()
      .eq('token', token);
  }

  // ─── Logout tất cả thiết bị ───────────────────────────
  async removeAllRefreshTokens(userId: string) {
    // Đếm số session trước khi xóa
    const { count } = await this.supabase
      .from(this.RT_TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    await this.supabase
      .from(this.RT_TABLE)
      .delete()
      .eq('user_id', userId);

    return count || 0;
  }

  // ─── Lấy danh sách phiên đăng nhập ───────────────────
  async getActiveSessions(userId: string) {
    const { data } = await this.supabase
      .from(this.RT_TABLE)
      .select('id, device_name, ip_address, user_agent, created_at, last_used_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString()) // chỉ lấy token còn hạn
      .order('last_used_at', { ascending: false });

    return data || [];
  }

  // ─── Lưu reset password token ────────────────────────
  async saveResetToken(email: string, token: string, expiresAt: Date) {
    await this.supabase
      .from(this.TABLE)
      .update({ reset_token: token, reset_token_expires: expiresAt.toISOString() })
      .eq('email', email);
  }

  async findByResetToken(token: string) {
    const { data } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('reset_token', token)
      .single();

    if (!data) return null;
    if (new Date(data.reset_token_expires) < new Date()) return null;
    return data;
  }

  async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.supabase
      .from(this.TABLE)
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  // ─── Helper: tạo username unique ─────────────────────
  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (username.length < 3) username = 'user' + username;

    const { data } = await this.supabase
      .from(this.TABLE)
      .select('username')
      .eq('username', username)
      .single();

    if (data) username = `${username}${Math.floor(1000 + Math.random() * 9000)}`;
    return username;
  }
}
