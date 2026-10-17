import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient as PrismaUsuarios } from '@internal/usuarios-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { AuthConstants } from '../../auth/v1/config/auth.constants';
import { ActualizarUsuarioFincaDto, CrearUsuarioFincaDto } from './portal-fincas.dto';

/** Sin letras que se confunden (0/O, 1/l/I) para dictarla por teléfono. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const clave = () => Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');

/**
 * Usuarios del portal de fincas (rol FINCA), administrados por la oficina:
 * como frmWEBusers del viejo (crea el usuario, genera la clave y le asigna
 * fincas). La clave se muestra una sola vez; se guarda con bcrypt (el viejo la
 * guardaba en texto plano).
 */
@Injectable()
export class UsuariosFincasService {
  constructor(
    @Inject('PrismaClientUsuarios') private readonly db: PrismaUsuarios,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  async listar() {
    const us = await this.db.user.findMany({
      where: { role: 'FINCA' },
      include: { fincas: { select: { idFinca: true } } },
      orderBy: { username: 'asc' },
    });
    const ids = [...new Set(us.flatMap((u) => u.fincas.map((f) => f.idFinca)))];
    const fincas = new Map(
      (await this.maestros.finca.findMany({ where: { id: { in: ids } }, select: { id: true, nombreFinca: true, tag: true } })).map(
        (f) => [f.id, f.tag?.trim() || f.nombreFinca],
      ),
    );
    return us.map((u) => ({
      id: u.id,
      usuario: u.username,
      nombre: u.firstName,
      email: u.email.endsWith('@fincas.local') ? null : u.email,
      activo: u.isActive,
      fincas: u.fincas.map((f) => ({ id: f.idFinca, nombre: fincas.get(f.idFinca) ?? `#${f.idFinca}` })),
      creado: u.createdAt.toISOString(),
    }));
  }

  async crear(dto: CrearUsuarioFincaDto) {
    const usuario = dto.usuario.trim().toUpperCase();
    const existe = await this.db.user.findFirst({
      where: { OR: [{ username: usuario }, ...(dto.email ? [{ email: dto.email.toLowerCase() }] : [])] },
    });
    if (existe) throw new ConflictException(existe.username === usuario ? `El usuario ${usuario} ya existe.` : 'Ese correo ya está usado.');
    const nueva = clave();
    const u = await this.db.user.create({
      data: {
        username: usuario,
        // El correo es obligatorio en la tabla de usuarios: si la finca no tiene, uno interno.
        email: dto.email?.toLowerCase() ?? `${usuario.toLowerCase()}@fincas.local`,
        firstName: dto.nombre.trim(),
        lastName: '',
        password: await bcrypt.hash(nueva, AuthConstants.PASSWORD.SALT_ROUNDS),
        role: 'FINCA',
        fincas: { createMany: { data: [...new Set(dto.fincas)].map((idFinca) => ({ idFinca })) } },
      },
    });
    return { id: u.id, usuario: u.username, clave: nueva };
  }

  async actualizar(id: string, dto: ActualizarUsuarioFincaDto) {
    const u = await this.db.user.findFirst({ where: { id, role: 'FINCA' } });
    if (!u) throw new NotFoundException('Usuario de finca no encontrado.');
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { firstName: dto.nombre.trim() } : {}),
          ...(dto.activo !== undefined ? { isActive: dto.activo } : {}),
        },
      });
      if (dto.fincas) {
        await tx.usuarioFinca.deleteMany({ where: { userId: id } });
        await tx.usuarioFinca.createMany({ data: [...new Set(dto.fincas)].map((idFinca) => ({ userId: id, idFinca })) });
      }
    });
    return { id };
  }

  async nuevaClave(id: string) {
    const u = await this.db.user.findFirst({ where: { id, role: 'FINCA' } });
    if (!u) throw new NotFoundException('Usuario de finca no encontrado.');
    const nueva = clave();
    await this.db.user.update({ where: { id }, data: { password: await bcrypt.hash(nueva, AuthConstants.PASSWORD.SALT_ROUNDS) } });
    return { id, usuario: u.username, clave: nueva };
  }
}
