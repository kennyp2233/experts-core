import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaClient } from '.prisma/usuarios-client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject('PrismaClientUsuarios') private prisma: PrismaClient) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: (() => {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET must be defined in environment variables');
        }
        return process.env.JWT_SECRET;
      })(),
    });
  }

  async validate(payload: any): Promise<{
    userId: string;
    username: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
