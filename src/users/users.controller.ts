import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, SetPasswordDto, ChangePasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users/me
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản của mình' })
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    // Thêm thông tin có mật khẩu chưa (để FE biết hiển thị form nào)
    const hasPassword = await this.usersService.hasPassword(req.user.id);
    return {
      success: true,
      data: { ...user, hasPassword },
    };
  }

  // PATCH /api/users/me
  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân (tên, avatar, bio)' })
  async updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    const data = await this.usersService.update(req.user.id, dto);
    return { success: true, message: 'Cập nhật thành công', data };
  }

  // POST /api/users/me/set-password
  @Post('me/set-password')
  @ApiOperation({
    summary: 'Thêm mật khẩu cho tài khoản OAuth',
    description: `Dành cho tài khoản đăng ký qua **Google/GitHub** chưa có mật khẩu.
    \nSau khi set, có thể đăng nhập bằng email + mật khẩu mới này.
    \nNếu tài khoản đã có mật khẩu → dùng API \`/me/change-password\` thay thế.`,
  })
  async setPassword(@Request() req, @Body() dto: SetPasswordDto) {
    try {
      const result = await this.usersService.setPassword(req.user.id, dto.newPassword);
      return { success: true, ...result };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  // POST /api/users/me/change-password
  @Post('me/change-password')
  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description: `Dành cho tài khoản **đã có mật khẩu**.
    \nNếu tài khoản OAuth chưa có mật khẩu → dùng API \`/me/set-password\` thay thế.`,
  })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    try {
      const result = await this.usersService.changePassword(
        req.user.id,
        dto.currentPassword,
        dto.newPassword,
      );
      return { success: true, ...result };
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
