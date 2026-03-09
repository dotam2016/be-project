import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ─── Global Prefix ───────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ─────────────────────────────────────────────
  // ⚠️  ĐÂY LÀ NƠI DUY NHẤT CẦN SỬA KHI THÊM DOMAIN MỚI
  //
  // Cách thêm domain mới:
  //   1. Thêm vào mảng ALLOWED_ORIGINS bên dưới, HOẶC
  //   2. Thêm vào biến CORS_ORIGINS trong file .env (cách khuyến nghị khi deploy)
  //      Ví dụ: CORS_ORIGINS=https://myapp.com,https://admin.myapp.com
  //
  // Postman / REST client luôn hoạt động bình thường vì CORS chỉ áp dụng trên trình duyệt.
  // ─────────────────────────────────────────────────────

  const ALLOWED_ORIGINS: string[] = [
    // --- Local development ---
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',  // Vite
    'http://localhost:4200',  // Angular

    // --- Production domains ---
    // 'https://myapp.com',
    // 'https://www.myapp.com',
    // 'https://admin.myapp.com',

    // --- Đọc thêm từ .env (CORS_ORIGINS=url1,url2,url3) ---
    ...(process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : []),
  ];

  app.enableCors({
    origin: (requestOrigin: string, callback) => {
      // Cho phép request không có origin (Postman, mobile app, server-to-server)
      if (!requestOrigin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(requestOrigin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked: ${requestOrigin}`);
        callback(new Error(`CORS: Domain "${requestOrigin}" không được phép`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Validation Pipe ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // tự động loại bỏ field không có trong DTO
      forbidNonWhitelisted: true, // báo lỗi nếu có field lạ
      transform: true,           // tự động transform kiểu dữ liệu
    }),
  );

  // ─── Swagger Docs ─────────────────────────────────────
  // Swagger luôn bật để dùng được trên cả production (Render)
  // Nếu muốn tắt Swagger trên production thì đổi điều kiện:
  //   if (process.env.NODE_ENV !== 'production') { ... }
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 8000}`;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('API Documentation')
    .setVersion('1.0')
    // Khai báo đúng URL server — quan trọng khi dùng Swagger trên production
    .addServer(serverUrl, process.env.NODE_ENV === 'production' ? 'Production (Render)' : 'Local')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // giữ token sau khi reload trang Swagger
    },
  });
  console.log(`📚 Swagger Docs: ${serverUrl}/api/docs`);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on: http://localhost:${port}/api`);
}

bootstrap();
