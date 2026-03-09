import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// Dùng decorator này để đánh dấu route cần role nào
// Ví dụ: @Roles(Role.SUPER_ADMIN)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
