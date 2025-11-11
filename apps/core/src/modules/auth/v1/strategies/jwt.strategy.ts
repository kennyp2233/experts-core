import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient } from '.prisma/usuarios-client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('PrismaClientUsuarios') private prisma: PrismaClient) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    });
  }

  async validate(payload: any): Promise<{
    userId: string;
    username: string;
    role: string;
    email: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Usuario inactivo. Contacte al administrador',
      );
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }
}
