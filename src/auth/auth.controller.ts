import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/register
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  async register(@Body() dto: RegisterDto, @Request() req) {
    const result = await this.authService.register(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, message: 'Đăng ký thành công!', data: result };
  }

  // POST /api/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng nhập',
    description: `Trả về **accessToken** (15 phút) và **refreshToken** (30 ngày).
    \n- Mỗi lần login tạo ra 1 phiên mới (multi-device).
    \n- Gửi \`deviceName\` để dễ nhận biết thiết bị (ví dụ: "Chrome on Windows").`,
  })
  async login(@Body() dto: LoginDto, @Request() req) {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, message: 'Đăng nhập thành công', data: result };
  }

  // POST /api/auth/refresh
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Làm mới accessToken',
    description: 'Dùng refreshToken để lấy cặp token mới. Token cũ sẽ bị vô hiệu hóa (rotation).',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshTokens(dto.refreshToken);
    return { success: true, message: 'Làm mới token thành công', data: result };
  }

  // POST /api/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đăng xuất thiết bị hiện tại',
    description: 'Gửi refreshToken của thiết bị muốn logout. Chỉ logout đúng thiết bị đó.',
  })
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  // POST /api/auth/logout-all
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Đăng xuất tất cả thiết bị',
    description: 'Xóa toàn bộ phiên đăng nhập. Tất cả thiết bị phải login lại.',
  })
  async logoutAll(@Request() req) {
    return this.authService.logoutAll(req.user.id);
  }

  // GET /api/auth/sessions
  @Get('sessions')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Xem danh sách thiết bị đang đăng nhập',
    description: 'Trả về tất cả phiên đang hoạt động — giống trang "Devices" của Google.',
  })
  async getSessions(@Request() req) {
    const data = await this.authService.getSessions(req.user.id);
    return {
      success: true,
      message: `Bạn đang đăng nhập trên ${data.length} thiết bị`,
      data,
    };
  }

  // POST /api/auth/forgot-password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi email đặt lại mật khẩu' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // POST /api/auth/reset-password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu — logout tất cả thiết bị sau khi đổi' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ════════════════════════════════════════════════════
  // OAUTH
  // ════════════════════════════════════════════════════

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Đăng nhập bằng Google' })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const url = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${url}/oauth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Đăng nhập bằng GitHub' })
  async githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Request() req, @Res() res: Response) {
    const result = await this.authService.oauthLogin(req.user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const url = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${url}/oauth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`);
  }
}
