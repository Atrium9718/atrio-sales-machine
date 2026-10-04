import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { FirebaseAuthGuard } from './auth.guard';

@Injectable()
export class AdminGuard extends FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.dbUser;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Se requieren permisos de administrador');
    }

    return true;
  }
}
