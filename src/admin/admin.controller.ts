import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto, BanUserDto, QueryUsersDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

// ⚠️  TẤT CẢ route trong controller này đều yêu cầu SUPER_ADMIN
@ApiTags('Admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /api/admin/stats
  @Get('stats')
  @ApiOperation({ summary: '[SUPER_ADMIN] Thống kê tài khoản theo role' })
  async getStats() {
    const data = await this.adminService.getStats();
    return { success: true, data };
  }

  // GET /api/admin/users
  @Get('users')
  @ApiOperation({ summary: '[SUPER_ADMIN] Danh sách tất cả người dùng' })
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.adminService.findAllUsers(query);
    return { success: true, ...result };
  }

  // GET /api/admin/users/:id
  @Get('users/:id')
  @ApiOperation({ summary: '[SUPER_ADMIN] Chi tiết 1 người dùng' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.adminService.findUserById(id);
    return { success: true, data };
  }

  // PATCH /api/admin/users/:id/role
  @Patch('users/:id/role')
  @ApiOperation({
    summary: '[SUPER_ADMIN] Cập nhật role người dùng',
    description: 'Chỉ set được USER hoặc SUPER_ADMIN. Để khóa tài khoản dùng API /ban',
  })
  async updateRole(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const data = await this.adminService.updateRole(id, req.user.id, dto);
    return {
      success: true,
      message: `Đã cập nhật role thành ${data.role}`,
      data,
    };
  }

  // PATCH /api/admin/users/:id/ban
  @Patch('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SUPER_ADMIN] Khóa tài khoản',
    description: 'Khóa tài khoản và logout ngay lập tức trên tất cả thiết bị',
  })
  async banUser(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: BanUserDto,
  ) {
    const data = await this.adminService.banUser(id, req.user.id, dto);
    return {
      success: true,
      message: `Đã khóa tài khoản ${data.email}`,
      data,
    };
  }

  // PATCH /api/admin/users/:id/unban
  @Patch('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[SUPER_ADMIN] Mở khóa tài khoản' })
  async unbanUser(@Param('id') id: string, @Request() req) {
    const data = await this.adminService.unbanUser(id, req.user.id);
    return {
      success: true,
      message: `Đã mở khóa tài khoản ${data.email}`,
      data,
    };
  }
}
