import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'DISABLED',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'DISABLED',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:8000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, displayName, emails, photos } = profile;
    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0]?.value,
      username: displayName,
      avatarUrl: photos[0]?.value,
      accessToken,
    };
    done(null, user);
  }
}
