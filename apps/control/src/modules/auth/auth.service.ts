import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AdminDto } from './dto/auth-response.dto';
import { plainToClass } from 'class-transformer';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    try {
      const admin = await this.prisma.admin.findFirst({
        where: {
          OR: [
            { username },
            { email: username }
          ],
          isActive: true
        }
      });

      if (!admin) {
        this.logger.warn(`Login attempt failed: User not found - ${username}`);
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        this.logger.warn(`Login attempt failed: Invalid password - ${username}`);
        return null;
      }

      // Exclude password from return
      const { password: _, ...result } = admin;
      return result;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Update last login
    await this.prisma.admin.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    const payload = { 
      username: user.username, 
      sub: user.id, 
      role: user.role 
    };

    const token = this.jwtService.sign(payload);
    const adminDto = plainToClass(AdminDto, { ...user, lastLogin: new Date() });

    this.logger.log(`Successful login for user: ${user.username}`);

    return {
      success: true,
      data: {
        token,
        admin: adminDto,
      },
      message: 'Login exitoso'
    };
  }

  async getProfile(userId: string): Promise<AdminDto> {
    const admin = await this.prisma.admin.findUnique({
      where: { 
        id: userId,
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!admin) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return plainToClass(AdminDto, admin);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async createAdmin(adminData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) {
    const hashedPassword = await this.hashPassword(adminData.password);
    
    return this.prisma.admin.create({
      data: {
        ...adminData,
        password: hashedPassword,
        role: (adminData.role as AdminRole) || AdminRole.SUPERVISOR
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
  }
}
