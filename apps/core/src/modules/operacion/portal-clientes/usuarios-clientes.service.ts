import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaClient as PrismaUsuarios } from '@internal/usuarios-client';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { AuthConstants } from '../../auth/v1/config/auth.constants';
import { ActualizarUsuarioClienteDto, CrearUsuarioClienteDto } from './portal-clientes.dto';

/** Sin letras que se confunden (0/O, 1/l/I). */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const clave = () => Array.from({ length: 10 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');

/**
 * Usuarios del portal de clientes (rol CLIENTE), administrados por la oficina
 * igual que los de las fincas: la oficina crea el usuario, le asigna sus
 * clientes y le pasa la clave (se muestra una sola vez; bcrypt).
 */
@Injectable()
export class UsuariosClientesService {
  constructor(
    @Inject('PrismaClientUsuarios') private readonly db: PrismaUsuarios,
    @Inject('PrismaClientDatosMaestros') private readonly maestros: PrismaMaestros,
  ) {}

  async listar() {
    const us = await this.db.user.findMany({
      where: { role: 'CLIENTE' },
      include: { clientes: { select: { idCliente: true } } },
      orderBy: { username: 'asc' },
    });
    const ids = [...new Set(us.flatMap((u) => u.clientes.map((c) => c.idCliente)))];
    const clientes = new Map(
      (await this.maestros.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, alias: true } })).map(
        (c) => [c.id, c.alias?.trim() || c.nombre],
      ),
    );
    return us.map((u) => ({
      id: u.id,
      usuario: u.username,
      nombre: u.firstName,
      email: u.email.endsWith('@clientes.local') ? null : u.email,
      activo: u.isActive,
      clientes: u.clientes.map((c) => ({ id: c.idCliente, nombre: clientes.get(c.idCliente) ?? `#${c.idCliente}` })),
      creado: u.createdAt.toISOString(),
    }));
  }

  async crear(dto: CrearUsuarioClienteDto) {
    const usuario = dto.usuario.trim().toUpperCase();
    const existe = await this.db.user.findFirst({
      where: { OR: [{ username: usuario }, ...(dto.email ? [{ email: dto.email.toLowerCase() }] : [])] },
    });
    if (existe) throw new ConflictException(existe.username === usuario ? `El usuario ${usuario} ya existe.` : 'Ese correo ya está usado.');
    await this.validarClientes(dto.clientes);
    const nueva = clave();
    const u = await this.db.user.create({
      data: {
        username: usuario,
        email: dto.email?.toLowerCase() ?? `${usuario.toLowerCase()}@clientes.local`,
        firstName: dto.nombre.trim(),
        lastName: '',
        password: await bcrypt.hash(nueva, AuthConstants.PASSWORD.SALT_ROUNDS),
        role: 'CLIENTE',
        clientes: { createMany: { data: [...new Set(dto.clientes)].map((idCliente) => ({ idCliente })) } },
      },
    });
    return { id: u.id, usuario: u.username, clave: nueva };
  }

  async actualizar(id: string, dto: ActualizarUsuarioClienteDto) {
    const u = await this.db.user.findFirst({ where: { id, role: 'CLIENTE' } });
    if (!u) throw new NotFoundException('Usuario de cliente no encontrado.');
    if (dto.clientes) await this.validarClientes(dto.clientes);
    await this.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { firstName: dto.nombre.trim() } : {}),
          ...(dto.activo !== undefined ? { isActive: dto.activo } : {}),
        },
      });
      if (dto.clientes) {
        await tx.usuarioCliente.deleteMany({ where: { userId: id } });
        await tx.usuarioCliente.createMany({ data: [...new Set(dto.clientes)].map((idCliente) => ({ userId: id, idCliente })) });
      }
    });
    return { id };
  }

  async nuevaClave(id: string) {
    const u = await this.db.user.findFirst({ where: { id, role: 'CLIENTE' } });
    if (!u) throw new NotFoundException('Usuario de cliente no encontrado.');
    const nueva = clave();
    await this.db.user.update({ where: { id }, data: { password: await bcrypt.hash(nueva, AuthConstants.PASSWORD.SALT_ROUNDS) } });
    return { id, usuario: u.username, clave: nueva };
  }

  private async validarClientes(ids: number[]) {
    const n = await this.maestros.cliente.count({ where: { id: { in: ids } } });
    if (n !== new Set(ids).size) throw new NotFoundException('Algún cliente no existe.');
  }
}
