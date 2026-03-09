-- ================================================
-- MIGRATION 002: Tạo lại bảng posts với đầy đủ SEO fields
-- Chạy file này trong Supabase SQL Editor
-- ================================================

-- Xóa bảng cũ nếu đã tạo từ migration 001
DROP TABLE IF EXISTS public.posts CASCADE;

-- ─── Tạo lại bảng Posts đầy đủ ──────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Nội dung
  title             TEXT NOT NULL,
  content           TEXT,
  image_url         TEXT,           -- URL ảnh từ Cloudinary
  image_id          TEXT,           -- Public ID Cloudinary (dùng để xóa ảnh)

  -- SEO
  page_url          TEXT UNIQUE NOT NULL,   -- /blog/huong-dan-nestjs (slug)
  meta_title        TEXT,                   -- Tiêu đề tab trình duyệt & Google (tối đa 60 ký tự)
  meta_description  TEXT,                   -- Mô tả Google (tối đa 160 ký tự)

  -- Trạng thái
  is_published      BOOLEAN DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Index để tăng tốc truy vấn ────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_user_id     ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_page_url    ON public.posts(page_url);
CREATE INDEX IF NOT EXISTS idx_posts_published   ON public.posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at  ON public.posts(created_at DESC);

-- ─── Row Level Security (RLS) ──────────────────────────
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Ai cũng xem được bài đã published
CREATE POLICY "Anyone can view published posts"
  ON public.posts FOR SELECT
  USING (is_published = TRUE);

-- Chỉ chủ sở hữu mới xem được bài chưa publish
CREATE POLICY "Owner can view own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

-- Chỉ chủ sở hữu mới tạo/sửa/xóa bài viết của mình
CREATE POLICY "Owner can manage own posts"
  ON public.posts FOR ALL
  USING (auth.uid() = user_id);

-- ─── Trigger auto update updated_at ────────────────────
CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Verify kết quả ────────────────────────────────────
-- Sau khi chạy, kiểm tra bảng đã tạo đúng chưa:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'posts' ORDER BY ordinal_position;
