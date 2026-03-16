import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'johndoe', minLength: 3 })
  @IsString()
  @MinLength(3, { message: 'Username phải có ít nhất 3 ký tự' })
  username: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Xin chào, tôi là...' })
  @IsOptional()
  @IsString()
  bio?: string;
}

export class SetPasswordDto {
  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Mật khẩu mới — dùng cho tài khoản đăng ký qua Google/GitHub muốn thêm đăng nhập bằng email',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', description: 'Mật khẩu hiện tại' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;
}
