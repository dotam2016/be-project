import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // ─── Đăng ký ─────────────────────────────────────────
  async register(registerDto: RegisterDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.create(registerDto);
    await this.emailService.sendWelcomeEmail(user.email, user.username);

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken, {
      deviceName: 'First device',
      ...meta,
    });

    return {
      user: { id: user.id, email: user.email, username: user.username },
      ...tokens,
    };
  }

  // ─── Đăng nhập ────────────────────────────────────────
  async login(loginDto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    // Kiểm tra tài khoản bị khóa
    if (user.role === 'BANNED') {
      throw new UnauthorizedException(
        `Tài khoản của bạn đang bị khóa tạm thời. Lý do: ${user.banned_reason || 'Vi phạm điều khoản'}`,
      );
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Tài khoản này đăng ký qua mạng xã hội. Vui lòng dùng Google/GitHub để đăng nhập.',
      );
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken, {
      deviceName: loginDto.deviceName,
      ...meta,
    });

    return {
      user: { id: user.id, email: user.email, username: user.username },
      ...tokens,
    };
  }

  // ─── Refresh Token ────────────────────────────────────
  async refreshTokens(oldRefreshToken: string) {
    // Tạo token mới trước
    let userId: string;
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.usersService.findById(userId);
    const newTokens = await this.generateTokenPair(user.id, user.email);

    // Xoay vòng: xóa token cũ, lưu token mới (giữ nguyên thông tin thiết bị)
    const validUserId = await this.usersService.validateAndRotateRefreshToken(
      oldRefreshToken,
      newTokens.refreshToken,
    );

    if (!validUserId) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    return {
      user: { id: user.id, email: user.email },
      ...newTokens,
    };
  }

  // ─── Logout thiết bị hiện tại ─────────────────────────
  async logout(refreshToken: string) {
    await this.usersService.removeRefreshToken(refreshToken);
    return { message: 'Đăng xuất thành công' };
  }

  // ─── Logout tất cả thiết bị ───────────────────────────
  async logoutAll(userId: string) {
    const count = await this.usersService.removeAllRefreshTokens(userId);
    return {
      message: `Đã đăng xuất khỏi tất cả thiết bị`,
      devicesLoggedOut: count,
    };
  }

  // ─── Lấy danh sách phiên đăng nhập ───────────────────
  async getSessions(userId: string) {
    return this.usersService.getActiveSessions(userId);
  }

  // ─── OAuth Login ──────────────────────────────────────
  async oauthLogin(
    oauthProfile: {
      provider: string;
      providerId: string;
      email: string;
      username: string;
      avatarUrl?: string;
      accessToken?: string;
    },
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findOrCreateOAuthUser(oauthProfile);
    const tokens = await this.generateTokenPair(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken, {
      deviceName: `${oauthProfile.provider} OAuth`,
      ...meta,
    });

    return {
      user: { id: user.id, email: user.email, username: user.username },
      ...tokens,
    };
  }

  // ─── Quên mật khẩu ───────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn qua email' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.saveResetToken(user.email, resetToken, expiresAt);
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn qua email' };
  }

  // ─── Đặt lại mật khẩu ────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user) throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');

    await this.usersService.updatePassword(user.id, dto.newPassword);
    // Bắt buộc đăng nhập lại trên tất cả thiết bị sau khi đổi mật khẩu
    await this.usersService.removeAllRefreshTokens(user.id);

    return { message: 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại trên tất cả thiết bị.' };
  }

  // ─── Helper: Tạo cặp token ────────────────────────────
  private async generateTokenPair(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ─── Helper: Lưu refresh token ───────────────────────
  private async storeRefreshToken(
    userId: string,
    token: string,
    meta?: { deviceName?: string; ip?: string; userAgent?: string },
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.usersService.saveRefreshToken({
      userId,
      token,
      expiresAt,
      deviceName: meta?.deviceName,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }
}
