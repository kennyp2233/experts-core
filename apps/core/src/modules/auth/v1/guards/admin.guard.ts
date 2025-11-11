import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../dto/update-user-role.dto';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return user && user.role === UserRole.ADMIN;
  }
}
