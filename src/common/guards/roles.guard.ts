import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy danh sách role được phép từ decorator @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không có @Roles decorator → không giới hạn role
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    // Tài khoản bị khóa không được làm gì
    if (user.role === Role.BANNED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đang bị khóa tạm thời. Vui lòng liên hệ admin.',
      );
    }

    // Kiểm tra user có role phù hợp không
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền: ${requiredRoles.join(' hoặc ')}`,
      );
    }

    return true;
  }
}
