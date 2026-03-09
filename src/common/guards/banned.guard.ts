import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '../enums/role.enum';

// Guard này check tài khoản bị khóa ở MỌI route cần JWT
// Dùng kết hợp với JwtAuthGuard
@Injectable()
export class BannedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (user?.role === Role.BANNED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đang bị khóa tạm thời. Vui lòng liên hệ admin để được hỗ trợ.',
      );
    }

    return true;
  }
}
