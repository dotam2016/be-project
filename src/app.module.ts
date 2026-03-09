import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { EmailModule } from './email/email.module';
import { SupabaseModule } from './config/supabase.module';
import { AdminModule } from './admin/admin.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    // ─── Config Module (load .env) ────────────────────
    ConfigModule.forRoot({
      isGlobal: true,  // dùng được ở mọi module không cần import lại
      envFilePath: '.env',
    }),

    // ─── Core Modules ─────────────────────────────────
    SupabaseModule,
    AuthModule,
    UsersModule,
    UploadModule,
    EmailModule,
    PostsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
