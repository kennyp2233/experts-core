import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaMaestros } from '@internal/datos-maestros-client';
import { modoOperacion } from '../comun/modo-operacion';
import { Campo, DefFormulario, FORMULARIOS, Opcion } from './formularios-maestros';

/** Campo como lo recibe el front: con las opciones ya resueltas. */
export type CampoPublico = Omit<Campo, 'opcionesDe' | 'columnas'> & { columnas?: CampoPublico[] };

type Valores = Record<string, unknown>;

const obtener = (o: unknown, ruta: string): unknown =>
  ruta.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined), o);

/** Decimal de Prisma → number; el resto tal cual. */
const plano = (v: unknown): unknown =>
  v !== null && typeof v === 'object' && 'toNumber' in (v as object) ? (v as { toNumber(): number }).toNumber() : v;

const todosLosCampos = (d: DefFormulario): Campo[] => d.secciones.flatMap((s) => s.campos);

/**
 * Altas y cambios de los datos maestros, con los formularios de
 * `formularios-maestros.ts`. En modo sombra lo que viene del sistema viejo
 * (registrado por el sync) no se edita: se cambia allá y llega solo; lo creado
 * aquí sí. Nada se borra: se desactiva, como en el sistema viejo.
 */
@Injectable()
export class EdicionMaestrosService {
  private readonly logger = new Logger('DatosMaestros');

  constructor(@Inject('PrismaClientDatosMaestros') private readonly db: PrismaMaestros) {}

  def(entidad: string): DefFormulario {
    const d = FORMULARIOS[entidad];
    if (!d) throw new NotFoundException('Estos datos no se editan en el sistema nuevo.');
    return d;
  }

  editable(entidad: string): boolean {
    return entidad in FORMULARIOS;
  }

  /** Formulario con las opciones resueltas (una consulta por lista, aunque se repita). */
  async formulario(entidad: string) {
    const d = this.def(entidad);
    const cache = new Map<Campo['opcionesDe'], Promise<Opcion[]>>();
    const resolver = async (c: Campo): Promise<CampoPublico> => {
      const { opcionesDe, columnas, ...resto } = c;
      let opciones = c.opciones;
      if (opcionesDe) {
        if (!cache.has(opcionesDe)) cache.set(opcionesDe, opcionesDe(this.db));
        opciones = await cache.get(opcionesDe)!;
      }
      return { ...resto, opciones, columnas: columnas ? await Promise.all(columnas.map(resolver)) : undefined };
    };
    return {
      entidad,
      singular: d.singular,
      femenino: !!d.femenino,
      modo: modoOperacion(),
      secciones: await Promise.all(d.secciones.map(async (s) => ({ ...s, campos: await Promise.all(s.campos.map(resolver)) }))),
    };
  }

  /** Ids (como texto) de una lista que vinieron del sistema viejo. */
  async delViejo(entidad: string, ids: Array<number | string>): Promise<Set<string>> {
    const d = FORMULARIOS[entidad];
    if (!d || ids.length === 0) return new Set();
    const rs = await this.db.syncLegacyRegistro.findMany({
      where: { entidad: d.entidadSync, idPg: { in: ids.map(String) } },
      select: { idPg: true },
    });
    return new Set(rs.map((r) => r.idPg!));
  }

  private async vieneDelViejo(d: DefFormulario, r: Record<string, unknown>): Promise<boolean> {
    if (r.codigoAccess !== undefined && r.codigoAccess !== null) return true;
    const id = String(r[d.pk ?? 'id']);
    return !!(await this.db.syncLegacyRegistro.findFirst({ where: { entidad: d.entidadSync, idPg: id }, select: { id: true } }));
  }

  /** Relaciones a incluir para leer los campos con ruta (`guiaM.x`, `aerolineasPlantilla.conceptos`). */
  private include(d: DefFormulario): Record<string, unknown> | undefined {
    const inc: Record<string, any> = {};
    for (const c of todosLosCampos(d)) {
      const [rel, sub] = c.clave.split('.');
      if (sub === undefined) {
        if (c.tipo === 'tabla') inc[rel] = true;
        continue;
      }
      if (c.tipo === 'tabla') {
        const actual = inc[rel] === true || inc[rel] === undefined ? { include: {} } : inc[rel];
        actual.include[sub] = true;
        inc[rel] = actual;
      } else if (inc[rel] === undefined) {
        inc[rel] = true;
      }
    }
    return Object.keys(inc).length ? inc : undefined;
  }

  private async buscar(d: DefFormulario, id: string) {
    const pk = d.pk ?? 'id';
    const n = Number(id);
    if (!Number.isInteger(n)) throw new BadRequestException('id inválido');
    const r = await d.delegate(this.db).findUnique({ where: { [pk]: n }, include: this.include(d) });
    if (!r) throw new NotFoundException(`No se encontró ese ${d.singular}.`);
    return r;
  }

  /** Valores actuales para la ficha y el formulario, y si se pueden cambiar. */
  async edicion(entidad: string, id: string) {
    const d = this.def(entidad);
    const r = await this.buscar(d, id);
    const viejo = await this.vieneDelViejo(d, r);
    const valores: Valores = {};
    for (const c of todosLosCampos(d)) {
      const v = obtener(r, c.clave);
      valores[c.clave] =
        c.tipo === 'tabla'
          ? ((v as Record<string, unknown>[] | undefined) ?? []).map((fila) =>
              Object.fromEntries((c.columnas ?? []).map((col) => [col.clave, plano(fila[col.clave]) ?? null])),
            )
          : (plano(v) ?? null);
    }
    return {
      id: r[d.pk ?? 'id'] as number,
      valores,
      delSistemaViejo: viejo,
      editable: !viejo || modoOperacion() === 'activo',
    };
  }

  async crear(entidad: string, valores: Valores, usuario?: string) {
    const d = this.def(entidad);
    const data = await this.armar(d, valores, true);
    const r = await this.grabar(d, () => d.delegate(this.db).create({ data }));
    const id = r[d.pk ?? 'id'] as number;
    this.logger.log(`${usuario ?? '?'} creó ${d.singular} ${id}`);
    return { id };
  }

  async actualizar(entidad: string, id: string, valores: Valores, usuario?: string) {
    const d = this.def(entidad);
    const r = await this.buscar(d, id);
    if (modoOperacion() === 'sombra' && (await this.vieneDelViejo(d, r))) {
      throw new ForbiddenException(
        `Este ${d.singular} viene del sistema viejo: mientras se use, se cambia allá y el cambio llega aquí solo.`,
      );
    }
    const data = await this.armar(d, valores, false);
    const pk = d.pk ?? 'id';
    await this.grabar(d, () => d.delegate(this.db).update({ where: { [pk]: r[pk] }, data }));
    this.logger.log(`${usuario ?? '?'} cambió ${d.singular} ${id}`);
    return { id: r[pk] as number };
  }

  private async grabar<T>(d: DefFormulario, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'P2002') throw new ConflictException(d.repetido ?? `Ya hay un ${d.singular} con esos datos.`);
      if (code === 'P2003' || code === 'P2025') throw new BadRequestException('Uno de los datos elegidos ya no existe. Recarga y vuelve a intentar.');
      throw e;
    }
  }

  /**
   * Valores del formulario → `data` de Prisma. Valida tipos, obligatorios,
   * largos y que lo elegido exista; junta todos los errores por campo.
   * Al modificar, los códigos (`soloAlCrear`) no se tocan.
   */
  private async armar(d: DefFormulario, valores: Valores, crear: boolean): Promise<Record<string, unknown>> {
    if (!valores || typeof valores !== 'object') throw new BadRequestException('Faltan los datos.');
    const errores: Record<string, string> = {};
    const cache = new Map<Campo['opcionesDe'], Promise<Opcion[]>>();
    const opcionesDe = async (c: Campo) => {
      if (!c.opcionesDe) return c.opciones ?? [];
      if (!cache.has(c.opcionesDe)) cache.set(c.opcionesDe, c.opcionesDe(this.db));
      return cache.get(c.opcionesDe)!;
    };

    const convertir = async (c: Campo, crudo: unknown, clave: string): Promise<unknown> => {
      const vacio = crudo === undefined || crudo === null || (typeof crudo === 'string' && crudo.trim() === '');
      if (c.tipo === 'si-no') return crudo === true || crudo === 'true';
      if (vacio) {
        if (c.requerido) errores[clave] = `Falta ${c.etiqueta.toLowerCase()}.`;
        return null;
      }
      switch (c.tipo) {
        case 'texto':
        case 'parrafo': {
          let t = String(crudo);
          t =
            c.tipo === 'parrafo'
              ? t
                  .split(/\r?\n/)
                  .map((l) => l.trim().replace(/\s+/g, ' '))
                  .join('\n')
                  .replace(/^\n+|\n+$/g, '')
                  .trim()
              : t.trim().replace(/\s+/g, ' ');
          if (c.mayusculas) t = t.toLocaleUpperCase('es');
          if (c.max && t.length > c.max) errores[clave] = `${c.etiqueta}: máximo ${c.max} caracteres.`;
          return t;
        }
        case 'numero':
        case 'entero': {
          const n = typeof crudo === 'number' ? crudo : Number(String(crudo).replace(',', '.'));
          if (!Number.isFinite(n)) errores[clave] = `${c.etiqueta} debe ser un número.`;
          else if (c.tipo === 'entero' && !Number.isInteger(n)) errores[clave] = `${c.etiqueta} debe ser un número entero.`;
          return n;
        }
        case 'opciones': {
          const o = (await opcionesDe(c)).find((x) => String(x.valor) === String(crudo));
          if (!o) errores[clave] = `${c.etiqueta}: elige una opción de la lista.`;
          return o?.valor ?? null;
        }
        default:
          return crudo;
      }
    };

    const raiz: Record<string, unknown> = {};
    /** Subtablas 1:1: campos y tablas hijas de cada una. */
    const subs: Record<string, { campos: Record<string, unknown>; tablas: Record<string, unknown[]> }> = {};
    const tablasRaiz: Record<string, unknown[]> = {};

    for (const c of todosLosCampos(d)) {
      if (!crear && c.soloAlCrear) continue;
      const dado = c.clave in valores;
      if (!crear && !dado) continue;
      const crudo = dado ? valores[c.clave] : c.inicial;
      const [rel, sub] = c.clave.split('.');

      if (c.tipo === 'tabla') {
        const filas = Array.isArray(crudo) ? crudo : [];
        const convertidas: Record<string, unknown>[] = [];
        for (const [i, fila] of filas.entries()) {
          const f = (fila ?? {}) as Valores;
          const out: Record<string, unknown> = {};
          for (const col of c.columnas ?? []) {
            out[col.clave] = await convertir(col, f[col.clave], `${c.clave}.${i}.${col.clave}`);
          }
          convertidas.push(out);
        }
        if (sub === undefined) tablasRaiz[rel] = convertidas;
        else ((subs[rel] ??= { campos: {}, tablas: {} }).tablas[sub] = convertidas);
        continue;
      }

      const v = await convertir(c, crudo, c.clave);
      if (sub === undefined) raiz[rel] = v;
      else (subs[rel] ??= { campos: {}, tablas: {} }).campos[sub] = v;
    }

    if (Object.keys(errores).length > 0) {
      throw new BadRequestException({ message: 'Revisa los datos marcados.', errores });
    }

    const data: Record<string, unknown> = { ...raiz };
    for (const [rel, filas] of Object.entries(tablasRaiz)) {
      data[rel] = crear ? { create: filas } : { deleteMany: {}, create: filas };
    }
    for (const [rel, { campos, tablas }] of Object.entries(subs)) {
      const alCrear: Record<string, unknown> = { ...campos };
      const alCambiar: Record<string, unknown> = { ...campos };
      for (const [t, filas] of Object.entries(tablas)) {
        alCrear[t] = { create: filas };
        alCambiar[t] = { deleteMany: {}, create: filas };
      }
      const conDatos = Object.values(campos).some((v) => v !== null) || Object.values(tablas).some((f) => f.length > 0);
      if (crear) {
        if (conDatos) data[rel] = { create: alCrear };
      } else {
        data[rel] = { upsert: { create: alCrear, update: alCambiar } };
      }
    }
    return data;
  }
}
