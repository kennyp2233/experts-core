import { LoginQRStatus } from '../enums/login-qr-status.enum';
import { QRLoginToken } from '../value-objects/qr-login-token.vo';

export class LoginQREntity {
  constructor(
    public readonly id: string,
    public readonly qrToken: QRLoginToken,
    public readonly workerId: string,
    public readonly adminId: string,
    public readonly status: LoginQRStatus,
    public readonly createdAt: Date,
    public readonly expiresAt?: Date,
    public readonly usedAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === LoginQRStatus.PENDING && !this.isExpired();
  }

  canBeUsed(): boolean {
    return this.isPending();
  }

  markAsUsed(): LoginQREntity {
    if (!this.canBeUsed()) {
      throw new Error('QR cannot be marked as used: not in pending state or expired');
    }

    return new LoginQREntity(
      this.id,
      this.qrToken,
      this.workerId,
      this.adminId,
      LoginQRStatus.USED,
      this.createdAt,
      this.expiresAt,
      new Date(),
      new Date()
    );
  }

  markAsExpired(): LoginQREntity {
    return new LoginQREntity(
      this.id,
      this.qrToken,
      this.workerId,
      this.adminId,
      LoginQRStatus.EXPIRED,
      this.createdAt,
      this.expiresAt,
      this.usedAt,
      new Date()
    );
  }
}
