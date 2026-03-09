# 🚀 NestJS Backend API

Backend API với NestJS + Supabase + Cloudinary + Resend

## 📦 Tech Stack

| Công nghệ | Mục đích |
|---|---|
| **NestJS** | BE Framework (TypeScript) |
| **Supabase** | Database (PostgreSQL) |
| **Cloudinary** | Lưu trữ ảnh |
| **Resend** | Gửi email |
| **JWT** | Authentication (Access + Refresh Token) |
| **Render** | Deploy |

---

## ⚙️ Cài đặt local

### Bước 1 — Cài dependencies
```bash
npm install
```

### Bước 2 — Tạo file .env
```bash
cp .env.example .env
```
Sau đó điền tất cả các giá trị trong file `.env` (xem hướng dẫn bên dưới).

### Bước 3 — Lấy các API Keys

#### 🗄️ Supabase
1. Vào https://supabase.com → **New Project**
2. Vào **Settings → API**
3. Copy **Project URL** → `SUPABASE_URL`
4. Copy **anon/public key** → `SUPABASE_ANON_KEY`
5. Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

#### 📸 Cloudinary
1. Vào https://cloudinary.com → **Dashboard**
2. Copy **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
3. Copy **API Key** → `CLOUDINARY_API_KEY`
4. Copy **API Secret** → `CLOUDINARY_API_SECRET`

#### 📧 Resend
1. Vào https://resend.com → **API Keys → Create API Key**
2. Copy key → `RESEND_API_KEY`
3. Điền email gửi đi → `RESEND_FROM_EMAIL`
   > ⚠️ Chưa có domain riêng thì dùng `onboarding@resend.dev` để test.
   > Email chỉ gửi được đến đúng email đăng ký tài khoản Resend.

#### 🔑 JWT Secret
Tạo 2 secret key ngẫu nhiên (dùng lệnh bên dưới, chạy 2 lần):
```bash
openssl rand -base64 32
```
Paste kết quả vào `JWT_SECRET` và `JWT_REFRESH_SECRET` (2 giá trị khác nhau).

### Bước 4 — Chạy migrations trong Supabase
Vào **Supabase Dashboard → SQL Editor**, chạy lần lượt từng file theo đúng thứ tự số:

| File | Nội dung |
|---|---|
| `supabase/migrations/001_init.sql` | Tạo bảng users, posts |
| `supabase/migrations/002_posts_seo.sql` | Thêm SEO fields cho posts |
| `supabase/migrations/003_refresh_token_oauth.sql` | Tạo bảng oauth_accounts |
| `supabase/migrations/004_refresh_tokens_table.sql` | Tạo bảng refresh_tokens (multi-device) |
| `supabase/migrations/005_roles.sql` | Thêm role (SUPER_ADMIN, USER, BANNED) |

### Bước 5 — Tạo tài khoản SUPER_ADMIN đầu tiên
1. Chạy server và đăng ký tài khoản qua `POST /api/auth/register`
2. Vào Supabase SQL Editor, chạy:
```sql
UPDATE public.users
  SET role = 'SUPER_ADMIN'
  WHERE email = 'your-email@example.com';
```

### Bước 6 — Chạy server
```bash
# Development (có hot reload)
npm run start:dev

# Production
npm run build && npm run start:prod
```

Swagger Docs (chỉ có ở development):
```
http://localhost:8000/api/docs
```

---

## 🚀 Deploy lên Render

### Bước 1 — Tạo tài khoản
Vào https://render.com → Đăng ký bằng GitHub.

### Bước 2 — Tạo Web Service
1. **New → Web Service**
2. Kết nối GitHub repo của bạn
3. Điền thông tin:

| Setting | Giá trị |
|---|---|
| **Environment** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Instance Type** | `Free` |

### Bước 3 — Thêm biến môi trường
Vào tab **Environment** trong Render dashboard, thêm tất cả biến từ file `.env.example`:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
FRONTEND_URL=https://your-frontend.com
CORS_ORIGINS=https://your-frontend.com
```

> ⚠️ **KHÔNG** upload file `.env` lên GitHub. Chỉ điền biến trực tiếp trên Render Dashboard.

### Bước 4 — Deploy
Render tự động build và deploy mỗi khi bạn push code lên GitHub.

> ℹ️ **Lưu ý Free Tier của Render:** Server sẽ bị ngủ sau 15 phút không có request. Request đầu tiên sau khi ngủ sẽ chậm hơn ~30 giây (cold start). Đây là giới hạn của free tier, upgrade lên Starter ($7/tháng) để tránh.

### Bước 5 — Cập nhật CORS sau khi có URL Render
Sau khi deploy xong, Render sẽ cấp cho bạn URL dạng `https://your-app.onrender.com`.
Thêm URL đó vào biến `CORS_ORIGINS` trên Render Dashboard:
```
CORS_ORIGINS=https://your-frontend.com,https://your-app.onrender.com
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Đăng ký tài khoản |
| POST | `/api/auth/login` | ❌ | Đăng nhập (trả về accessToken + refreshToken) |
| POST | `/api/auth/refresh` | ❌ | Lấy accessToken mới bằng refreshToken |
| POST | `/api/auth/logout` | ❌ | Logout thiết bị hiện tại |
| POST | `/api/auth/logout-all` | ✅ JWT | Logout tất cả thiết bị |
| GET | `/api/auth/sessions` | ✅ JWT | Danh sách thiết bị đang đăng nhập |
| POST | `/api/auth/forgot-password` | ❌ | Gửi email đặt lại mật khẩu |
| POST | `/api/auth/reset-password` | ❌ | Đặt lại mật khẩu |
| GET | `/api/auth/google` | ❌ | Đăng nhập bằng Google |
| GET | `/api/auth/github` | ❌ | Đăng nhập bằng GitHub |

### Users
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/users/me` | ✅ JWT | Thông tin bản thân |
| PATCH | `/api/users/me` | ✅ JWT | Cập nhật thông tin |

### Posts
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/posts` | ❌ | Danh sách bài viết (có filter, sort, phân trang) |
| GET | `/api/posts/:id` | ❌ | Chi tiết bài viết theo ID |
| GET | `/api/posts/by-url/:pageUrl` | ❌ | Chi tiết bài viết theo page_url (SEO) |
| GET | `/api/posts/my/list` | ✅ JWT | Bài viết của tôi |
| POST | `/api/posts` | ✅ JWT | Tạo bài viết |
| PATCH | `/api/posts/:id` | ✅ JWT | Cập nhật bài viết |
| PATCH | `/api/posts/:id/publish` | ✅ JWT | Toggle publish/unpublish |
| DELETE | `/api/posts` | ✅ JWT | Xóa 1 hoặc nhiều bài viết |

### Upload
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/upload/image` | ✅ JWT | Upload 1 ảnh lên Cloudinary |
| POST | `/api/upload/images` | ✅ JWT | Upload nhiều ảnh (tối đa 10) |
| DELETE | `/api/upload/:publicId` | ✅ JWT | Xóa ảnh khỏi Cloudinary |

### Admin (chỉ SUPER_ADMIN)
| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/api/admin/stats` | ✅ SUPER_ADMIN | Thống kê tài khoản theo role |
| GET | `/api/admin/users` | ✅ SUPER_ADMIN | Danh sách tất cả users |
| GET | `/api/admin/users/:id` | ✅ SUPER_ADMIN | Chi tiết 1 user |
| PATCH | `/api/admin/users/:id/role` | ✅ SUPER_ADMIN | Đổi role (USER ↔ SUPER_ADMIN) |
| PATCH | `/api/admin/users/:id/ban` | ✅ SUPER_ADMIN | Khóa tài khoản |
| PATCH | `/api/admin/users/:id/unban` | ✅ SUPER_ADMIN | Mở khóa tài khoản |

### Health
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra server còn sống không |

---

## 🗂️ Cấu trúc project

```
src/
├── auth/                        # Authentication
│   ├── dto/                     # RegisterDto, LoginDto, ...
│   ├── strategies/              # JWT, JwtRefresh, Google, GitHub
│   ├── auth.controller.ts       # Các route /api/auth/*
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/                       # Quản lý user
│   ├── dto/
│   ├── users.controller.ts      # /api/users/*
│   ├── users.service.ts         # Tương tác Supabase
│   └── users.module.ts
├── posts/                       # Bài viết
│   ├── dto/
│   ├── posts.controller.ts      # /api/posts/*
│   ├── posts.service.ts
│   └── posts.module.ts
├── admin/                       # Quản trị (SUPER_ADMIN only)
│   ├── dto/
│   ├── admin.controller.ts      # /api/admin/*
│   ├── admin.service.ts
│   └── admin.module.ts
├── upload/                      # Upload ảnh Cloudinary
│   ├── upload.controller.ts
│   ├── upload.service.ts
│   └── upload.module.ts
├── email/                       # Gửi email qua Resend
│   ├── email.service.ts
│   └── email.module.ts
├── config/
│   ├── supabase.module.ts       # Supabase client (global)
│   └── cloudinary.config.ts
├── common/
│   ├── decorators/
│   │   └── roles.decorator.ts   # @Roles(Role.SUPER_ADMIN)
│   ├── enums/
│   │   └── role.enum.ts         # SUPER_ADMIN | USER | BANNED
│   └── guards/
│       ├── jwt-auth.guard.ts    # Kiểm tra JWT hợp lệ
│       ├── jwt-refresh.guard.ts # Kiểm tra Refresh Token
│       ├── roles.guard.ts       # Kiểm tra role
│       └── banned.guard.ts      # Chặn tài khoản bị khóa
├── app.module.ts
└── main.ts                      # ← CORS config nằm ở đây
supabase/
└── migrations/                  # Chạy theo thứ tự 001 → 005
```

---

## 🔒 Bảo mật

- **KHÔNG** commit file `.env` lên Git (đã có trong `.gitignore`)
- `JWT_SECRET` và `JWT_REFRESH_SECRET` phải khác nhau và đủ dài (`openssl rand -base64 32`)
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở server, không bao giờ expose ra FE
- Password được hash bằng bcrypt (salt rounds = 10)
- Tài khoản bị BANNED bị logout ngay lập tức khỏi tất cả thiết bị

## 🌐 CORS

Chỉ cần sửa **1 nơi duy nhất**: `src/main.ts` — mảng `ALLOWED_ORIGINS`.

Hoặc dùng biến môi trường (không cần sửa code):
```dotenv
CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
```
