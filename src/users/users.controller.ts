import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users/me
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  // PATCH /api/users/me
  @Patch('me')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const updated = await this.usersService.update(req.user.id, updateUserDto);
    return {
      success: true,
      message: 'Cập nhật thành công',
      data: updated,
    };
  }
}
