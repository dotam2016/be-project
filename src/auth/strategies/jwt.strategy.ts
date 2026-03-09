import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../config/supabase.module';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    @Inject(SUPABASE_CLIENT) private supabase: SupabaseClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    if (!payload.sub) throw new UnauthorizedException('Token không hợp lệ');

    // Lấy role mới nhất từ DB mỗi request
    // (đảm bảo nếu bị ban thì bị chặn ngay, không cần đợi token hết hạn)
    const { data: user } = await this.supabase
      .from('users')
      .select('id, email, role')
      .eq('id', payload.sub)
      .single();

    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');

    return {
      id: user.id,
      email: user.email,
      role: user.role,  // ← role luôn fresh từ DB
    };
  }
}
