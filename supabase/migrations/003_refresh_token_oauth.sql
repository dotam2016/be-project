-- ================================================
-- MIGRATION 003: RefreshToken + OAuth accounts
-- Chạy trong Supabase SQL Editor
-- ================================================

-- ─── 1. Thêm refresh_token vào bảng users ────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS refresh_token       TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_expires TIMESTAMPTZ;

-- ─── 2. Tạo bảng oauth_accounts ──────────────────────
-- Mỗi user có thể liên kết nhiều provider (Google, GitHub, Facebook...)
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,

  -- Thông tin provider
  provider      TEXT NOT NULL,     -- 'google' | 'github' | 'facebook'
  provider_id   TEXT NOT NULL,     -- ID do bên thứ 3 cấp (Google sub, GitHub id...)

  -- Token từ provider (optional, dùng nếu cần gọi API của họ)
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Mỗi provider chỉ liên kết 1 lần với 1 user
  UNIQUE(provider, provider_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_oauth_user_id       ON public.oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider      ON public.oauth_accounts(provider, provider_id);

-- RLS
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oauth accounts"
  ON public.oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger auto update updated_at
CREATE TRIGGER set_oauth_updated_at
  BEFORE UPDATE ON public.oauth_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Verify ──────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'users' ORDER BY ordinal_position;

-- SELECT * FROM public.oauth_accounts LIMIT 5;
