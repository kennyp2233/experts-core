import { ExceptionCodeStatus } from "../enums/exception-code-status.enum";

export class ExceptionCodeEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly workerId: string,
    public readonly adminId: string,
    public readonly status: ExceptionCodeStatus,
    public readonly expiresAt: Date,
    public readonly createdAt: Date,
    public readonly usedAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validateCode();
  }

  private validateCode(): void {
    if (!/^\d{6}$/.test(this.code)) {
      throw new Error('Exception code must be exactly 6 digits');
    }
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isPending(): boolean {
    return this.status === ExceptionCodeStatus.PENDING && !this.isExpired();
  }

  canBeUsed(): boolean {
    return this.isPending();
  }

  markAsUsed(): ExceptionCodeEntity {
    if (!this.canBeUsed()) {
      throw new Error('Exception code cannot be marked as used: not in pending state or expired');
    }

    return new ExceptionCodeEntity(
      this.id,
      this.code,
      this.workerId,
      this.adminId,
      ExceptionCodeStatus.USED,
      this.expiresAt,
      this.createdAt,
      new Date(),
      new Date()
    );
  }

  markAsExpired(): ExceptionCodeEntity {
    return new ExceptionCodeEntity(
      this.id,
      this.code,
      this.workerId,
      this.adminId,
      ExceptionCodeStatus.EXPIRED,
      this.expiresAt,
      this.createdAt,
      this.usedAt,
      new Date()
    );
  }
}