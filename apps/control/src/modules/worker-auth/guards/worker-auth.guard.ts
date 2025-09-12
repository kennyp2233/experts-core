import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionValidatorDomainService } from '../domain/services/session-validator.domain-service';

@Injectable()
export class WorkerAuthGuard implements CanActivate {
  constructor(
    private readonly sessionValidator: SessionValidatorDomainService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('[WorkerAuthGuard] 🔐 Validando autenticación de worker');
    
    const request = context.switchToHttp().getRequest();
    const sessionToken = this.extractTokenFromHeader(request);
    
    console.log('[WorkerAuthGuard] Token presente:', !!sessionToken);
    console.log('[WorkerAuthGuard] Token preview:', sessionToken?.substring(0, 20) + '...');
    
    if (!sessionToken) {
      console.error('[WorkerAuthGuard] ❌ Session token no encontrado');
      throw new UnauthorizedException('Session token requerido');
    }

    try {
      console.log('[WorkerAuthGuard] Validando sesión...');
      const sessionInfo = await this.sessionValidator.validateSession(sessionToken);
      
      console.log('[WorkerAuthGuard] ✅ Sesión válida:', {
        workerId: sessionInfo.worker?.id,
        workerName: sessionInfo.worker?.name,
        depotId: sessionInfo.worker?.depot?.id,
        deviceId: sessionInfo.device?.id
      });
      
      // Establecer información del usuario para el request
      request.user = {
        workerId: sessionInfo.worker?.id,
        workerName: sessionInfo.worker?.name,
        depotId: sessionInfo.worker?.depot?.id,
        deviceId: sessionInfo.device?.id
      };
      
      // También mantener la estructura anterior por compatibilidad
      request.worker = sessionInfo.worker;
      request.device = sessionInfo.device;
      
      return true;
    } catch (error) {
      console.error('[WorkerAuthGuard] ❌ Error validando sesión:', error.message);
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
