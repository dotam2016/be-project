import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, QueryPostDto, DeleteManyPostsDto } from './dto/post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BannedGuard } from '../common/guards/banned.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ════════════════════════════════════════════════════
  // PUBLIC — Không cần đăng nhập
  // ════════════════════════════════════════════════════

  // GET /api/posts
  @Get()
  @ApiOperation({ summary: '[Public] Danh sách bài viết' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'nestjs' })
  @ApiQuery({ name: 'isPublished', required: false, example: true })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['created_at', 'updated_at', 'title'], example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  async findAll(@Query() query: QueryPostDto) {
    const result = await this.postsService.findAll(query);
    return { success: true, message: 'Lấy danh sách bài viết thành công', ...result };
  }

  // GET /api/posts/by-url/:pageUrl
  @Get('by-url/:pageUrl')
  @ApiOperation({
    summary: '[Public] Lấy bài viết theo page_url — dùng cho SEO',
    description: 'Ví dụ: GET /api/posts/by-url/huong-dan-nestjs',
  })
  @ApiParam({ name: 'pageUrl', example: 'huong-dan-nestjs' })
  async findByPageUrl(@Param('pageUrl') pageUrl: string) {
    const post = await this.postsService.findByPageUrl(pageUrl);
    if (!post) return { success: false, message: 'Không tìm thấy bài viết' };
    return { success: true, message: 'Lấy bài viết thành công', data: post };
  }

  // GET /api/posts/:id
  @Get(':id')
  @ApiOperation({ summary: '[Public] Lấy chi tiết bài viết theo ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.postsService.findOne(id);
    return { success: true, message: 'Lấy bài viết thành công', data };
  }

  // ════════════════════════════════════════════════════
  // PRIVATE — Cần đăng nhập
  // ════════════════════════════════════════════════════

  // GET /api/posts/my/list
  @Get('my/list')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Private] Bài viết của tôi' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['created_at', 'updated_at', 'title'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findMyPosts(@Request() req, @Query() query: QueryPostDto) {
    const result = await this.postsService.findMyPosts(req.user.id, query);
    return { success: true, message: 'Lấy danh sách bài viết của bạn thành công', ...result };
  }

  // POST /api/posts
  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, BannedGuard)
  @ApiOperation({ summary: '[Private] Tạo bài viết mới' })
  async create(@Request() req, @Body() dto: CreatePostDto) {
    const data = await this.postsService.create(req.user.id, dto);
    return { success: true, message: 'Tạo bài viết thành công', data };
  }

  // PATCH /api/posts/:id
  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, BannedGuard)
  @ApiOperation({ summary: '[Private] Cập nhật bài viết' })
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdatePostDto) {
    const data = await this.postsService.update(id, req.user.id, dto);
    return { success: true, message: 'Cập nhật bài viết thành công', data };
  }

  // PATCH /api/posts/:id/publish
  @Patch(':id/publish')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, BannedGuard)
  @ApiOperation({ summary: '[Private] Toggle publish/unpublish bài viết' })
  async togglePublish(@Param('id') id: string, @Request() req) {
    const data = await this.postsService.togglePublish(id, req.user.id);
    return { success: true, message: data.message, data };
  }

  // DELETE /api/posts  ← Xóa 1 hoặc nhiều bài
  @Delete()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, BannedGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Private] Xóa 1 hoặc nhiều bài viết',
    description: 'Truyền mảng `ids` — có thể xóa 1 hoặc nhiều bài cùng lúc.\n\nVí dụ xóa 1 bài: `{ "ids": ["uuid-1"] }`\n\nVí dụ xóa nhiều: `{ "ids": ["uuid-1", "uuid-2", "uuid-3"] }`',
  })
  async removeMany(@Request() req, @Body() dto: DeleteManyPostsDto) {
    const result = await this.postsService.removeMany(req.user.id, dto);
    return {
      success: true,
      message: `Đã xóa thành công ${result.deletedCount} bài viết`,
      data: result,
    };
  }
}
