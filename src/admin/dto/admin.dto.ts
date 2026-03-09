import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: [Role.SUPER_ADMIN, Role.USER],
    example: Role.SUPER_ADMIN,
    description: 'Role mới cho user (không thể set BANNED bằng API này, dùng API ban)',
  })
  @IsEnum([Role.SUPER_ADMIN, Role.USER], {
    message: 'Role chỉ được là SUPER_ADMIN hoặc USER',
  })
  role: Role.SUPER_ADMIN | Role.USER;
}

export class BanUserDto {
  @ApiPropertyOptional({
    example: 'Vi phạm điều khoản sử dụng',
    description: 'Lý do khóa tài khoản',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryUsersDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
