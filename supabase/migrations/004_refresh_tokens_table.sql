-- ================================================
-- MIGRATION 004: Bảng refresh_tokens (multi-device)
-- Chạy trong Supabase SQL Editor
-- ================================================

-- 1. Xóa cột cũ trong bảng users (không cần nữa)
ALTER TABLE public.users
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS refresh_token_expires;

-- 2. Tạo bảng refresh_tokens
--    Mỗi lần login = 1 record = 1 thiết bị
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  token        TEXT NOT NULL UNIQUE,      -- refresh token (đã hash)
  device_name  TEXT,                      -- tên thiết bị (FE tự gửi lên, ví dụ "Chrome on Windows")
  ip_address   TEXT,                      -- IP khi đăng nhập
  user_agent   TEXT,                      -- browser/OS info

  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()  -- lần cuối dùng token này
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rt_user_id   ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_token     ON public.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_rt_expires   ON public.refresh_tokens(expires_at);

-- RLS
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.refresh_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Tự động xóa token hết hạn (chạy định kỳ nếu cần)
-- DELETE FROM public.refresh_tokens WHERE expires_at < NOW();
