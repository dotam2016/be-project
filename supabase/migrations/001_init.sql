-- ================================================
-- SUPABASE SQL MIGRATION
-- Chạy file này trong Supabase SQL Editor:
-- https://supabase.com/dashboard > SQL Editor
-- ================================================

-- ─── Bảng Users ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE NOT NULL,
  password        TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  reset_token     TEXT,
  reset_token_expires TIMESTAMPTZ,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index để tìm kiếm nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token);

-- ─── Bảng Posts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  content          TEXT,
  image_url        TEXT,        -- URL ảnh từ Cloudinary
  image_id         TEXT,        -- Public ID Cloudinary (dùng để xóa)

  -- SEO Fields
  page_url         TEXT UNIQUE NOT NULL,   -- slug URL: huong-dan-hoc-nestjs
  meta_title       TEXT,                   -- tiêu đề SEO (tối ưu 50-60 ký tự)
  meta_description TEXT,                   -- mô tả SEO (tối ưu 150-160 ký tự)

  is_published     BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id   ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_page_url  ON public.posts(page_url);   -- quan trọng cho SEO routing
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(is_published);

-- ─── Row Level Security (RLS) ──────────────────────────────
-- Bật RLS cho bảng users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Chỉ cho phép đọc thông tin public của user
CREATE POLICY "Users can view public profiles" ON public.users
  FOR SELECT USING (true);

-- Chỉ cho phép user cập nhật profile của chính họ
-- (Sử dụng service_role_key trong NestJS nên bypass RLS,
--  policy này chỉ áp dụng khi dùng anon_key từ FE)
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Bật RLS cho bảng posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts" ON public.posts
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Users can manage own posts" ON public.posts
  FOR ALL USING (auth.uid() = user_id);

-- ─── Function auto update updated_at ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
