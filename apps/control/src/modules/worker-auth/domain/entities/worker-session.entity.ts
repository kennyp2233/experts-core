import { SessionStatus } from '../enums/session-status.enum';
import { SessionToken } from '../value-objects/session-token.vo';

export interface BasicDeviceInfo {
  deviceId: string;
  model?: string;
  platform: string;
  appVersion: string;
}

export class WorkerSessionEntity {
  constructor(
    public readonly id: string,
    public readonly workerId: string,
    public readonly deviceId: string,
    public readonly sessionToken: SessionToken,
    public readonly status: SessionStatus,
    public readonly loginTime: Date,
    public readonly lastActivity: Date,
    public readonly deviceInfo: BasicDeviceInfo,
    public readonly expiresAt?: Date
  ) {}

  isActive(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  updateActivity(): WorkerSessionEntity {
    if (!this.isActive()) {
      throw new Error('Cannot update activity on inactive session');
    }

    return new WorkerSessionEntity(
      this.id,
      this.workerId,
      this.deviceId,
      this.sessionToken,
      this.status,
      this.loginTime,
      new Date(),
      this.deviceInfo,
      this.expiresAt
    );
  }

  revoke(): WorkerSessionEntity {
    return new WorkerSessionEntity(
      this.id,
      this.workerId,
      this.deviceId,
      this.sessionToken,
      SessionStatus.REVOKED,
      this.loginTime,
      this.lastActivity,
      this.deviceInfo,
      this.expiresAt
    );
  }

  expire(): WorkerSessionEntity {
    return new WorkerSessionEntity(
      this.id,
      this.workerId,
      this.deviceId,
      this.sessionToken,
      SessionStatus.EXPIRED,
      this.loginTime,
      this.lastActivity,
      this.deviceInfo,
      this.expiresAt
    );
  }
}
