-- ================================================
-- MIGRATION 005: Thêm cột role vào bảng users
-- Chạy trong Supabase SQL Editor
-- ================================================

-- Tạo enum type cho role
CREATE TYPE public.user_role AS ENUM (
  'SUPER_ADMIN',  -- toàn quyền
  'USER',         -- tài khoản thường
  'BANNED'        -- bị khóa tạm thời
);

-- Thêm cột role vào bảng users (mặc định là USER)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS banned_reason TEXT,         -- lý do bị khóa
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,      -- thời điểm bị khóa
  ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.users(id); -- ai đã khóa

-- Index để filter theo role nhanh hơn
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ─── Tạo tài khoản SUPER_ADMIN đầu tiên ─────────────
-- ⚠️  Chạy riêng đoạn này SAU KHI đã đăng ký tài khoản qua API
-- Thay 'your-email@example.com' bằng email bạn đã đăng ký

-- UPDATE public.users
--   SET role = 'SUPER_ADMIN'
--   WHERE email = 'your-email@example.com';
