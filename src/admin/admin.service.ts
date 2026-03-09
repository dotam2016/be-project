import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { Role } from '../common/enums/role.enum';
import { UpdateUserRoleDto, BanUserDto, QueryUsersDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly TABLE = 'users';

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  // ─── Lấy danh sách tất cả users ──────────────────────
  async findAllUsers(query: QueryUsersDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let dbQuery = this.supabase
      .from(this.TABLE)
      .select(
        'id, email, username, full_name, avatar_url, role, banned_reason, banned_at, created_at, updated_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.search) {
      dbQuery = dbQuery.or(`email.ilike.%${query.search}%,username.ilike.%${query.search}%`);
    }

    if (query.role) {
      dbQuery = dbQuery.eq('role', query.role);
    }

    const { data, error, count } = await dbQuery;
    if (error) throw new Error(error.message);

    return {
      data,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  // ─── Lấy chi tiết 1 user ─────────────────────────────
  async findUserById(id: string) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('id, email, username, full_name, avatar_url, role, banned_reason, banned_at, created_at')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy người dùng');
    return data;
  }

  // ─── Cập nhật role ────────────────────────────────────
  async updateRole(targetUserId: string, adminId: string, dto: UpdateUserRoleDto) {
    // Không tự đổi role của chính mình
    if (targetUserId === adminId) {
      throw new BadRequestException('Không thể thay đổi role của chính mình');
    }

    const target = await this.findUserById(targetUserId);

    if (target.role === Role.BANNED) {
      throw new BadRequestException('Tài khoản đang bị khóa. Vui lòng mở khóa trước khi thay đổi role.');
    }

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({ role: dto.role, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select('id, email, username, role')
      .single();

    if (error) throw new Error('Cập nhật role thất bại');

    this.logger.log(`✅ Admin ${adminId} changed role of ${targetUserId} to ${dto.role}`);
    return data;
  }

  // ─── Khóa tài khoản ──────────────────────────────────
  async banUser(targetUserId: string, adminId: string, dto: BanUserDto) {
    if (targetUserId === adminId) {
      throw new BadRequestException('Không thể tự khóa tài khoản của chính mình');
    }

    const target = await this.findUserById(targetUserId);

    if (target.role === Role.BANNED) {
      throw new BadRequestException('Tài khoản này đã bị khóa rồi');
    }

    // Không được khóa SUPER_ADMIN khác
    if (target.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('Không thể khóa tài khoản SUPER_ADMIN');
    }

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({
        role: Role.BANNED,
        banned_reason: dto.reason || 'Vi phạm điều khoản',
        banned_at: new Date().toISOString(),
        banned_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id, email, username, role, banned_reason, banned_at')
      .single();

    if (error) throw new Error('Khóa tài khoản thất bại');

    // Xóa tất cả refresh token — buộc logout ngay lập tức
    await this.supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', targetUserId);

    this.logger.log(`🔒 Admin ${adminId} banned user ${targetUserId}: ${dto.reason}`);
    return data;
  }

  // ─── Mở khóa tài khoản ───────────────────────────────
  async unbanUser(targetUserId: string, adminId: string) {
    const target = await this.findUserById(targetUserId);

    if (target.role !== Role.BANNED) {
      throw new BadRequestException('Tài khoản này không bị khóa');
    }

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({
        role: Role.USER,           // trả về role USER sau khi mở khóa
        banned_reason: null,
        banned_at: null,
        banned_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id, email, username, role')
      .single();

    if (error) throw new Error('Mở khóa tài khoản thất bại');

    this.logger.log(`🔓 Admin ${adminId} unbanned user ${targetUserId}`);
    return data;
  }

  // ─── Thống kê nhanh ───────────────────────────────────
  async getStats() {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('role');

    if (error) throw new Error(error.message);

    const stats = {
      total: data.length,
      superAdmin: data.filter((u) => u.role === Role.SUPER_ADMIN).length,
      user: data.filter((u) => u.role === Role.USER).length,
      banned: data.filter((u) => u.role === Role.BANNED).length,
    };

    return stats;
  }
}
