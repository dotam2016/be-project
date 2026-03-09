import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'DISABLED',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'DISABLED',
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL') || 'http://localhost:8000/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    const { id, username, displayName, photos, emails } = profile;
    const user = {
      provider: 'github',
      providerId: String(id),
      email: emails?.[0]?.value || null,
      username: username || displayName,
      avatarUrl: photos?.[0]?.value || null,
      accessToken,
    };
    done(null, user);
  }
}
