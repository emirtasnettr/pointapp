import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '@prisma/client';
import type { StaffJwtUser } from '../strategies/staff-jwt.strategy';
import { staffHasPermission } from './staff-permissions';
import { STAFF_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class StaffPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(STAFF_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: StaffJwtUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException();
    }

    if (user.appRole === AppRole.SYSTEM_ADMIN) return true;

    const ok = required.every((slug) => staffHasPermission(user.appRole, slug));
    if (!ok) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor.');
    }
    return true;
  }
}
