import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hướng dẫn học NestJS từ đầu' })
  @IsString()
  @MinLength(3, { message: 'Tiêu đề phải có ít nhất 3 ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ example: 'Nội dung bài viết...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'folder/image_abc123' })
  @IsOptional()
  @IsString()
  imageId?: string;

  // ─── SEO Fields ───────────────────────────────────────
  @ApiProperty({
    example: 'huong-dan-hoc-nestjs-tu-dau',
    description: 'URL thân thiện SEO, chỉ dùng chữ thường, số và dấu gạch ngang',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'page_url chỉ được chứa chữ thường, số và dấu gạch ngang (ví dụ: bai-viet-cua-toi)',
  })
  pageUrl: string;

  @ApiPropertyOptional({
    example: 'Hướng dẫn học NestJS từ đầu | MyBlog',
    description: 'Tiêu đề hiển thị trên tab trình duyệt và Google (50-60 ký tự là tối ưu)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'meta_title tối ưu không nên vượt quá 60 ký tự' })
  metaTitle?: string;

  @ApiPropertyOptional({
    example: 'Bài viết hướng dẫn chi tiết cách học NestJS từ con số 0...',
    description: 'Mô tả ngắn hiển thị trên Google (150-160 ký tự là tối ưu)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'meta_description tối ưu không nên vượt quá 160 ký tự' })
  metaDescription?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

// UpdatePostDto kế thừa CreatePostDto nhưng tất cả field đều optional
export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class QueryPostDto {
  @ApiPropertyOptional({ example: 1, description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Số bài mỗi trang' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'nestjs', description: 'Tìm kiếm theo tiêu đề' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Lọc theo trạng thái published' })
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({
    example: 'created_at',
    description: 'Sắp xếp theo field',
    enum: ['created_at', 'updated_at', 'title'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'created_at' | 'updated_at' | 'title';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Chiều sắp xếp: desc = mới nhất trước | asc = cũ nhất trước',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class DeleteManyPostsDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Danh sách ID các bài viết muốn xóa (1 hoặc nhiều)',
    type: [String],
  })
  @IsArray()
  @IsUUID('all', { each: true, message: 'Mỗi ID phải là UUID hợp lệ' })
  ids: string[];
}
