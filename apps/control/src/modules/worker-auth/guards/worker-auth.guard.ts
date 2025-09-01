import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionValidatorDomainService } from '../domain/services/session-validator.domain-service';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  constructor(
    private readonly sessionValidator: SessionValidatorDomainService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = this.extractTokenFromHeader(request);
    
    if (!sessionToken) {
      throw new UnauthorizedException('Session token requerido');
    }

    try {
      const sessionInfo = await this.sessionValidator.validateSession(sessionToken);
      request.worker = sessionInfo.worker;
      request.device = sessionInfo.device;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
