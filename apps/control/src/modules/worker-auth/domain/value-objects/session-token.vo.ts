import * as crypto from 'crypto';

export class SessionToken {
  private readonly value: string;

  constructor(token?: string) {
    this.value = token || this.generateSecureToken();
    this.validate();
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private validate(): void {
    if (!this.value || this.value.length < 32) {
      throw new Error('Session token must be at least 32 characters');
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SessionToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
