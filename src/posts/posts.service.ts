import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.module';
import { CreatePostDto, UpdatePostDto, QueryPostDto, DeleteManyPostsDto } from './dto/post.dto';

// Các field được phép sort
const ALLOWED_SORT_FIELDS = ['created_at', 'updated_at', 'title'];

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly TABLE = 'posts';

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  // ─── Tạo bài viết mới ────────────────────────────────
  async create(userId: string, dto: CreatePostDto) {
    await this.checkPageUrlUnique(dto.pageUrl);

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert([{
        user_id: userId,
        title: dto.title,
        content: dto.content || null,
        image_url: dto.imageUrl || null,
        image_id: dto.imageId || null,
        page_url: dto.pageUrl,
        meta_title: dto.metaTitle || dto.title,
        meta_description: dto.metaDescription || null,
        is_published: dto.isPublished ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select(`
        id, title, content, image_url, image_id,
        page_url, meta_title, meta_description,
        is_published, created_at, updated_at,
        users (id, username, avatar_url)
      `)
      .single();

    if (error) {
      this.logger.error('Create post error:', error);
      throw new ConflictException(error.message);
    }
    return data;
  }

  // ─── Lấy danh sách bài viết (public) ─────────────────
  async findAll(query: QueryPostDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100); // max 100/trang
    const offset = (page - 1) * limit;

    // Validate và xác định sort field
    const sortBy = ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'created_at';
    const ascending = query.sortOrder === 'asc';

    let dbQuery = this.supabase
      .from(this.TABLE)
      .select(`
        id, title, image_url, page_url,
        meta_title, meta_description,
        is_published, created_at, updated_at,
        users (id, username, avatar_url)
      `, { count: 'exact' })
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    if (query.isPublished !== undefined) {
      dbQuery = dbQuery.eq('is_published', query.isPublished === true || (query.isPublished as any) === 'true');
    }

    if (query.search) {
      dbQuery = dbQuery.ilike('title', `%${query.search}%`);
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
      sort: { sortBy, sortOrder: ascending ? 'asc' : 'desc' },
    };
  }

  // ─── Lấy bài viết của tôi ─────────────────────────────
  async findMyPosts(userId: string, query: QueryPostDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const sortBy = ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'created_at';
    const ascending = query.sortOrder === 'asc';

    let dbQuery = this.supabase
      .from(this.TABLE)
      .select(`
        id, title, image_url, page_url,
        meta_title, meta_description,
        is_published, created_at, updated_at
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order(sortBy, { ascending })
      .range(offset, offset + limit - 1);

    if (query.search) {
      dbQuery = dbQuery.ilike('title', `%${query.search}%`);
    }

    if (query.isPublished !== undefined) {
      dbQuery = dbQuery.eq('is_published', query.isPublished === true || (query.isPublished as any) === 'true');
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
      sort: { sortBy, sortOrder: ascending ? 'asc' : 'desc' },
    };
  }

  // ─── Lấy chi tiết theo ID ─────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select(`
        id, title, content, image_url, image_id,
        page_url, meta_title, meta_description,
        is_published, created_at, updated_at,
        users (id, username, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy bài viết');
    return data;
  }

  // ─── Lấy chi tiết theo page_url (SEO) ────────────────
  async findByPageUrl(pageUrl: string) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select(`
        id, title, content, image_url,
        page_url, meta_title, meta_description,
        is_published, created_at, updated_at,
        users (id, username, avatar_url)
      `)
      .eq('page_url', pageUrl)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error('findByPageUrl error:', error);
    }
    return data || null;
  }

  // ─── Cập nhật bài viết ────────────────────────────────
  async update(id: string, userId: string, dto: UpdatePostDto) {
    await this.checkOwnership(id, userId);

    if (dto.pageUrl) {
      await this.checkPageUrlUnique(dto.pageUrl, id);
    }

    const updateData: any = { updated_at: new Date().toISOString() };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.imageUrl !== undefined) updateData.image_url = dto.imageUrl;
    if (dto.imageId !== undefined) updateData.image_id = dto.imageId;
    if (dto.pageUrl !== undefined) updateData.page_url = dto.pageUrl;
    if (dto.metaTitle !== undefined) updateData.meta_title = dto.metaTitle;
    if (dto.metaDescription !== undefined) updateData.meta_description = dto.metaDescription;
    if (dto.isPublished !== undefined) updateData.is_published = dto.isPublished;

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update(updateData)
      .eq('id', id)
      .select(`
        id, title, content, image_url,
        page_url, meta_title, meta_description,
        is_published, updated_at
      `)
      .single();

    if (error || !data) throw new NotFoundException('Cập nhật thất bại');
    return data;
  }

  // ─── Toggle publish/unpublish ─────────────────────────
  async togglePublish(id: string, userId: string) {
    const post = await this.checkOwnership(id, userId);

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .update({ is_published: !post.is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, title, is_published')
      .single();

    if (error) throw new Error(error.message);

    return {
      ...data,
      message: data.is_published ? 'Đã publish bài viết' : 'Đã ẩn bài viết',
    };
  }

  // ─── Xóa nhiều bài viết ───────────────────────────────
  async removeMany(userId: string, dto: DeleteManyPostsDto) {
    if (!dto.ids || dto.ids.length === 0) {
      throw new BadRequestException('Vui lòng cung cấp ít nhất 1 ID');
    }

    // Lấy tất cả bài viết theo ids
    const { data: posts, error: fetchError } = await this.supabase
      .from(this.TABLE)
      .select('id, user_id, title')
      .in('id', dto.ids);

    if (fetchError) throw new Error(fetchError.message);

    // Kiểm tra từng bài
    const notFound = dto.ids.filter(id => !posts.find(p => p.id === id));
    if (notFound.length > 0) {
      throw new NotFoundException(`Không tìm thấy bài viết với ID: ${notFound.join(', ')}`);
    }

    const notOwned = posts.filter(p => p.user_id !== userId);
    if (notOwned.length > 0) {
      throw new ForbiddenException(
        `Bạn không có quyền xóa: ${notOwned.map(p => `"${p.title}"`).join(', ')}`,
      );
    }

    // Xóa tất cả
    const { error: deleteError } = await this.supabase
      .from(this.TABLE)
      .delete()
      .in('id', dto.ids);

    if (deleteError) throw new Error('Xóa bài viết thất bại');

    return {
      deletedCount: dto.ids.length,
      deletedIds: dto.ids,
    };
  }

  // ─── Helper: Kiểm tra quyền sở hữu ──────────────────
  private async checkOwnership(postId: string, userId: string) {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('id, user_id, is_published')
      .eq('id', postId)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy bài viết');
    if (data.user_id !== userId) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');

    return data;
  }

  // ─── Helper: Kiểm tra page_url unique ────────────────
  private async checkPageUrlUnique(pageUrl: string, excludeId?: string) {
    let query = this.supabase
      .from(this.TABLE)
      .select('id')
      .eq('page_url', pageUrl);

    if (excludeId) query = query.neq('id', excludeId);

    const { data } = await query.single();
    if (data) throw new ConflictException(`page_url "${pageUrl}" đã được sử dụng`);
  }
}
