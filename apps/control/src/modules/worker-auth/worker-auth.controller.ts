import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { WorkerAuthService } from './application/services/worker-auth.service';
import { SessionManagerService } from './application/services/session-manager.service';
import { GenerateLoginQRDto } from './application/dto/generate-login-qr.dto';
import { WorkerLoginDto } from './application/dto/worker-login.dto';
import { LogoutDto } from './application/dto/logout.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { WorkerAuthGuard } from './guards/worker-auth.guard';

@Controller('worker-auth')
export class WorkerAuthController {
  constructor(
    private readonly workerAuthService: WorkerAuthService,
    private readonly sessionManagerService: SessionManagerService,
  ) {}

  // ===== ENDPOINTS PARA ADMINISTRADORES =====

  @Post('generate-qr')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.CREATED)
  async generateQR(
    @Body(ValidationPipe) dto: GenerateLoginQRDto,
    @Request() req
  ) {
    return this.workerAuthService.generateLoginQR(dto, req.user.id);
  }

  @Get('qr-status/:qrToken')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR', 'OPERATOR')
  async getQRStatus(@Param('qrToken') qrToken: string) {
    return this.sessionManagerService.getQRStatus(qrToken);
  }

  @Get('active-sessions')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async getActiveSessions() {
    return this.sessionManagerService.getActiveSessions();
  }

  @Delete('revoke-session/:sessionToken')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Param('sessionToken') sessionToken: string) {
    return this.sessionManagerService.revokeSession(sessionToken);
  }

  @Delete('force-logout/:workerId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.OK)
  async forceLogoutWorker(@Param('workerId') workerId: string) {
    return this.workerAuthService.forceLogoutWorker(workerId);
  }

  // ===== ENDPOINTS PARA WORKERS (APP MÓVIL) =====

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) dto: WorkerLoginDto) {
    return this.workerAuthService.authenticateWorker(dto);
  }

  @Get('session')
  @UseGuards(WorkerAuthGuard)
  async getSession(@Request() req) {
    const sessionToken = this.extractTokenFromHeader(req);
    return this.workerAuthService.refreshSession(sessionToken);
  }

  @Put('refresh')
  @UseGuards(WorkerAuthGuard)
  async refreshSession(@Request() req) {
    const sessionToken = this.extractTokenFromHeader(req);
    return this.workerAuthService.refreshSession(sessionToken);
  }

  @Post('logout')
  @UseGuards(WorkerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(ValidationPipe) dto: LogoutDto,
    @Request() req
  ) {
    const sessionToken = this.extractTokenFromHeader(req);
    return this.workerAuthService.logout(sessionToken, dto);
  }

  // ===== UTILITY METHODS =====

  private extractTokenFromHeader(request: any): string {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Authorization header not found');
    }
    return authHeader.substring(7);
  }
}
