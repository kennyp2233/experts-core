import { LoginQREntity } from '../entities/login-qr.entity';
import { WorkerSessionEntity, BasicDeviceInfo } from '../entities/worker-session.entity';
import { QRLoginToken } from '../value-objects/qr-login-token.vo';
import { SessionToken } from '../value-objects/session-token.vo';
import { LoginQRStatus } from '../enums/login-qr-status.enum';

export interface CreateLoginQRParams {
  qrToken: string;
  workerId: string;
  adminId: string;
  expiresAt?: Date;
  status: LoginQRStatus;
}

export interface CreateDeviceParams {
  deviceId: string;
  workerId: string;
  model?: string;
  platform: string;
  appVersion: string;
}

export interface UpdateDeviceSessionParams {
  isLoggedIn: boolean;
  sessionToken?: string;
  lastActivityAt: Date;
  sessionExpiry?: Date;
}

export interface WorkerAuthRepositoryInterface {
  // Worker operations
  findWorkerById(id: string): Promise<any>;
  updateWorkerAuthentication(workerId: string, isAuthenticated: boolean): Promise<void>;

  // QR operations
  createLoginQR(params: CreateLoginQRParams): Promise<LoginQREntity>;
  findQRByToken(qrToken: string): Promise<LoginQREntity | null>;
  updateQRStatus(qrId: string, status: LoginQRStatus, usedAt?: Date): Promise<void>;
  expireWorkerQRs(workerId: string): Promise<void>;

  // Device operations
  findDeviceByDeviceId(deviceId: string): Promise<any>;
  findDeviceBySessionToken(sessionToken: string): Promise<any>;
  createDevice(params: CreateDeviceParams): Promise<any>;
  updateDeviceSession(deviceId: string, params: UpdateDeviceSessionParams): Promise<void>;
  updateDeviceActivity(deviceId: string): Promise<void>;

  // Session operations
  findActiveSessionsByWorker(workerId: string): Promise<WorkerSessionEntity[]>;
  revokeSession(sessionToken: string): Promise<void>;
  getActiveSessions(): Promise<WorkerSessionEntity[]>;

  // Admin validation
  validateAdminPermissions(adminId: string): Promise<boolean>;
}
