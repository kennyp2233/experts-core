import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthConstants } from '../config/auth.constants';

/**
 * Servicio para gestión de contraseñas
 * Responsabilidad: Hashing y validación de contraseñas
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Genera un hash de la contraseña
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, AuthConstants.PASSWORD.SALT_ROUNDS);
  }

  /**
   * Valida una contraseña contra un hash
   */
  async validate(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      this.logger.error(`Error validating password: ${error.message}`);
      return false;
    }
  }
}
