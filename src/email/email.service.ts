import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@yourdomain.com';
    this.resend = new Resend(apiKey);
  }

  // ─── Gửi email xác nhận đăng ký ──────────────────────
  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Chào mừng bạn đã đăng ký!',
        html: this.buildWelcomeTemplate(username),
      });
      this.logger.log(`✅ Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send welcome email to ${to}`, error);
      throw error;
    }
  }

  // ─── Gửi email reset mật khẩu ────────────────────────
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: this.buildPasswordResetTemplate(resetLink),
      });
      this.logger.log(`✅ Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send reset email to ${to}`, error);
      throw error;
    }
  }

  // ─── Gửi email xác minh tài khoản ────────────────────
  async sendVerificationEmail(to: string, verifyToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verifyLink = `${frontendUrl}/verify-email?token=${verifyToken}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: 'Xác minh địa chỉ email của bạn',
        html: this.buildVerificationTemplate(verifyLink),
      });
      this.logger.log(`✅ Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send verification email to ${to}`, error);
      throw error;
    }
  }

  // ─── Email Templates ──────────────────────────────────
  private buildWelcomeTemplate(username: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Chào mừng ${username}! 🎉</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
        <p>Tài khoản của bạn đã được tạo thành công.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    `;
  }

  private buildPasswordResetTemplate(resetLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Đặt lại mật khẩu</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
        <a href="${resetLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; 
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Đặt lại mật khẩu
        </a>
        <p style="color: #666;">Link này sẽ hết hạn sau <strong>1 giờ</strong>.</p>
        <p style="color: #666;">Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    `;
  }

  private buildVerificationTemplate(verifyLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Xác minh email của bạn ✉️</h2>
        <p>Nhấn vào nút bên dưới để xác minh địa chỉ email:</p>
        <a href="${verifyLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #10B981; 
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Xác minh Email
        </a>
        <p style="color: #666;">Link này sẽ hết hạn sau <strong>24 giờ</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
      </div>
    `;
  }
}
