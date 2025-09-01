import * as crypto from 'crypto';

export class QRLoginToken {
  private readonly value: string;

  constructor(workerId: string, adminId: string, timestamp?: Date) {
    this.value = this.generateToken(workerId, adminId, timestamp || new Date());
    this.validate();
  }

  private generateToken(workerId: string, adminId: string, timestamp: Date): string {
    const payload = `${workerId}:${adminId}:${timestamp.getTime()}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    
    // Agregar un componente aleatorio para mayor seguridad
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `${hash.substring(0, 48)}${randomBytes}`;
  }

  private validate(): void {
    if (!this.value || this.value.length !== 64) {
      throw new Error('QR Login token must be exactly 64 characters');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: QRLoginToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
