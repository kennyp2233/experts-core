import { Role } from '@internal/usuarios-client';

/**
 * Payload del JWT token
 */
export interface TokenPayload {
  username: string;
  sub: string; // userId
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Información del usuario para generar tokens
 */
export interface UserForToken {
  id: string;
  username: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
}
