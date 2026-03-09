# 🚀 NestJS Backend Boilerplate

Backend API với NestJS + Supabase + Cloudinary + Resend

## 📦 Tech Stack

| Công nghệ | Mục đích |
|---|---|
| **NestJS** | BE Framework |
| **Supabase** | Database (PostgreSQL) |
| **Cloudinary** | Lưu trữ ảnh |
| **Resend** | Gửi email |
| **JWT** | Authentication |
| **Railway** | Deploy |

---

## ⚙️ Cài đặt và cấu hình

### Bước 1 — Cài dependencies
```bash
npm install
```

### Bước 2 — Tạo file .env
```bash
cp .env.example .env
```
Sau đó điền tất cả các giá trị trong file `.env`

### Bước 3 — Lấy các API Keys

#### 🗄️ Supabase
1. Vào https://supabase.com → **New Project**
2. Vào **Settings > API**
3. Copy **Project URL** → `SUPABASE_URL`
4. Copy **anon/public key** → `SUPABASE_ANON_KEY`
5. Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

#### 📸 Cloudinary
1. Vào https://cloudinary.com → **Dashboard**
2. Copy **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
3. Copy **API Key** → `CLOUDINARY_API_KEY`
4. Copy **API Secret** → `CLOUDINARY_API_SECRET`

#### 📧 Resend
1. Vào https://resend.com → **API Keys > Create API Key**
2. Copy key → `RESEND_API_KEY`
3. Điền email gửi đi → `RESEND_FROM_EMAIL`
   > ⚠️ Cần verify domain tại Resend nếu muốn dùng email domain riêng.
   > Nếu chưa có domain, dùng `onboarding@resend.dev` để test.

### Bước 4 — Tạo bảng trong Supabase
1. Vào **Supabase Dashboard > SQL Editor**
2. Copy toàn bộ nội dung file `supabase/migrations/001_init.sql`
3. Paste vào SQL Editor và **Run**

### Bước 5 — Chạy project
```bash
# Development
npm run start:dev

# Production
npm run build && npm run start:prod
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| POST | `/api/auth/forgot-password` | Gửi email đặt lại mật khẩu |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu |

### Users (cần JWT)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users/me` | Lấy thông tin bản thân |
| PATCH | `/api/users/me` | Cập nhật thông tin |

### Upload (cần JWT)
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/upload/image` | Upload 1 ảnh |
| POST | `/api/upload/images` | Upload nhiều ảnh |
| DELETE | `/api/upload/:publicId` | Xóa ảnh |

### Health
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Kiểm tra server |

---

## 📚 Swagger Docs

Khi chạy development, truy cập:
```
http://localhost:3000/api/docs
```

---

## 🚀 Deploy lên Railway

### Bước 1 — Tạo tài khoản
1. Vào https://railway.app → Đăng ký bằng GitHub

### Bước 2 — Tạo project
1. **New Project > Deploy from GitHub repo**
2. Chọn repository của bạn

### Bước 3 — Thêm biến môi trường
1. Vào **Variables** trong Railway dashboard
2. Thêm tất cả biến từ file `.env.example`
   > ⚠️ KHÔNG upload file `.env` lên GitHub!

### Bước 4 — Deploy
Railway sẽ tự động build và deploy mỗi khi bạn push code lên GitHub.

---

## 🗂️ Cấu trúc project

```
src/
├── auth/                   # Authentication (JWT)
│   ├── dto/               # Data Transfer Objects
│   ├── strategies/        # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/                  # User management
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts    # Tương tác với Supabase
│   └── users.module.ts
├── upload/                 # Image upload
│   ├── upload.controller.ts
│   ├── upload.service.ts   # Tương tác với Cloudinary
│   └── upload.module.ts
├── email/                  # Email service
│   ├── email.service.ts    # Gửi email qua Resend
│   └── email.module.ts
├── config/                 # Cấu hình services
│   ├── supabase.module.ts  # Supabase client
│   └── cloudinary.config.ts
├── common/
│   └── guards/
│       └── jwt-auth.guard.ts
├── app.module.ts
├── app.controller.ts
└── main.ts
supabase/
└── migrations/
    └── 001_init.sql        # SQL tạo bảng
```

---

## 🔒 Bảo mật

- Không bao giờ commit file `.env` lên Git
- `JWT_SECRET` phải là chuỗi ngẫu nhiên dài (chạy: `openssl rand -base64 32`)
- Dùng `SUPABASE_SERVICE_ROLE_KEY` chỉ ở server side, không bao giờ expose ra FE
- Passwords được hash bằng bcrypt (salt rounds = 10)
