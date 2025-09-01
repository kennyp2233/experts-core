import { Injectable } from '@nestjs/common';
import { GenerateWorkerLoginQRUseCase } from '../use-cases/generate-worker-login-qr.use-case';
import { AuthenticateWorkerUseCase } from '../use-cases/authenticate-worker.use-case';
import { RefreshSessionUseCase } from '../use-cases/refresh-session.use-case';
import { LogoutWorkerUseCase } from '../use-cases/logout-worker.use-case';
import { GenerateLoginQRDto } from '../dto/generate-login-qr.dto';
import { WorkerLoginDto } from '../dto/worker-login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { 
  QRGenerateResponseDto, 
  AuthResponseDto, 
  SessionInfoDto,
  LoginQRResponseDto
} from '../dto/session-info.dto';
import { LogoutResponseDto } from '../dto/logout.dto';

@Injectable()
export class WorkerAuthService {
  constructor(
    private readonly generateQRUseCase: GenerateWorkerLoginQRUseCase,
    private readonly authenticateUseCase: AuthenticateWorkerUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutWorkerUseCase,
  ) {}

  async generateLoginQR(dto: GenerateLoginQRDto, adminId: string): Promise<QRGenerateResponseDto> {
    const result = await this.generateQRUseCase.execute(dto, adminId);
    
    return {
      success: true,
      data: result,
      message: 'QR de login generado exitosamente'
    };
  }

  async authenticateWorker(dto: WorkerLoginDto): Promise<AuthResponseDto> {
    const sessionInfo = await this.authenticateUseCase.execute(dto);
    
    return {
      success: true,
      data: sessionInfo,
      message: 'Autenticación exitosa'
    };
  }

  async refreshSession(sessionToken: string): Promise<{
    success: boolean;
    data: SessionInfoDto;
  }> {
    const sessionInfo = await this.refreshSessionUseCase.execute(sessionToken);
    
    return {
      success: true,
      data: sessionInfo
    };
  }

  async logout(sessionToken: string, dto?: LogoutDto): Promise<LogoutResponseDto> {
    return this.logoutUseCase.execute(sessionToken, dto);
  }

  async forceLogoutWorker(workerId: string): Promise<LogoutResponseDto> {
    return this.logoutUseCase.executeForceLogout(workerId);
  }
}
