import {
  cargosAerolinea,
  cargosAgencia,
  juegoVigente,
  r2,
  resumirLiquidacion,
  ValoresLiquidacion,
} from '../liquidacion';
import { totalesDeLineas } from './totales';
import { CoordinacionCompleta, igual, ReglaNegocio } from './tipos';

/**
 * Reglas de liquidación (legacy-analysis/reglas/liquidacion.md). Solo aplican
 * a coordinaciones con totales guardados (`liqFlete`): las anteriores a
 * 2012-04 no los tienen.
 */
const conTotales = (c: CoordinacionCompleta) => c.liqFlete !== null;
const vigente = (c: CoordinacionCompleta) =>
  juegoVigente(c.liquidaciones, c.corteExtra) as (ValoresLiquidacion & { tipo: string }) | undefined;

export const reglaJuegoVigente: ReglaNegocio = {
  id: 'liquidacion.juego',
  nombre: 'Juego de valores vigente',
  descripcion: 'Peso cobrable y tarifa guardados = los del corte extra si lo tiene, si no los del normal (R1, R2).',
  evaluar: (c) => {
    const j = vigente(c);
    if (!conTotales(c) || !j) return null;
    const ok = igual(c.liqPesoCobrable, j.pesoCobrable, 0.001) && igual(c.liqTarifa, j.tarifa === null ? null : r2(j.tarifa), 0.005);
    return {
      ok,
      esperado: { pesoCobrable: c.liqPesoCobrable, tarifa: c.liqTarifa },
      calculado: { juego: j.tipo, pesoCobrable: j.pesoCobrable, tarifa: j.tarifa },
    };
  },
};

export const reglaFlete: ReglaNegocio = {
  id: 'liquidacion.flete',
  nombre: 'Flete',
  descripcion: 'Flete = peso cobrable × tarifa, redondeado a centavos (R3).',
  evaluar: (c) => {
    const j = vigente(c);
    if (!conTotales(c) || !j) return null;
    const flete = resumirLiquidacion(j).flete;
    return { ok: igual(flete, c.liqFlete), esperado: c.liqFlete, calculado: flete };
  },
};

export const reglaDueCarrier: ReglaNegocio = {
  id: 'liquidacion.dueCarrier',
  nombre: 'Cargos de aerolínea (due carrier)',
  descripcion: 'Guía aérea + combustible + seguridad + otros + aux1 + aux2 + cálculo aux. (R4, docDA).',
  evaluar: (c) => {
    const j = vigente(c);
    if (!conTotales(c) || !j) return null;
    const v = cargosAerolinea(j);
    return { ok: igual(v, c.liqDueCarrier), esperado: c.liqDueCarrier, calculado: v };
  },
};

export const reglaHandling: ReglaNegocio = {
  id: 'liquidacion.handling',
  nombre: 'Suma de cargos de agencia',
  descripcion: 'El handling guardado en cada juego = suma de los 7 códigos de agencia (R5, extHandling).',
  evaluar: (c) => {
    const juegos = c.liquidaciones.filter((l) => l.handling !== null);
    if (juegos.length === 0) return null;
    const calc = juegos.map((l) => ({ tipo: l.tipo, guardado: l.handling, suma: cargosAgencia(l) }));
    return {
      ok: calc.every((x) => igual(x.guardado, x.suma)),
      esperado: Object.fromEntries(calc.map((x) => [x.tipo, x.guardado])),
      calculado: Object.fromEntries(calc.map((x) => [x.tipo, x.suma])),
    };
  },
};

export const reglaDueAgent: ReglaNegocio = {
  id: 'liquidacion.dueAgent',
  nombre: 'Cargos de agencia (due agent)',
  descripcion: 'Suma de los códigos de agencia del juego vigente (R5, docDC).',
  evaluar: (c) => {
    const j = vigente(c);
    if (!conTotales(c) || !j) return null;
    const v = cargosAgencia(j);
    return { ok: igual(v, c.liqDueAgent), esperado: c.liqDueAgent, calculado: v };
  },
};

export const reglaTotal: ReglaNegocio = {
  id: 'liquidacion.total',
  nombre: 'Total de la guía',
  descripcion: 'Flete + cargos de aerolínea + IVA + cargos de agencia, desde los valores digitados (R6).',
  evaluar: (c) => {
    const j = vigente(c);
    if (!conTotales(c) || !j) return null;
    const total = resumirLiquidacion(j).total;
    return { ok: igual(total, c.liqTotal), esperado: c.liqTotal, calculado: total };
  },
};

export const reglaCabecera: ReglaNegocio = {
  id: 'liquidacion.cabecera',
  nombre: 'Fulls, piezas y peso de la liquidación',
  descripcion: 'Los fulls, piezas y peso bruto de la liquidación = totales de las líneas (R9).',
  evaluar: (c) => {
    if (!conTotales(c) || c.liqFulls === null) return null;
    const t = totalesDeLineas(c.guiaHijas.flatMap((g) => g.detalles));
    const ok = igual(c.liqFulls, t.fulls, 0.001) && igual(c.liqPiezas, t.cajas, 0.001) && igual(c.liqPesoBruto, t.kgs);
    return {
      ok,
      esperado: { fulls: c.liqFulls, piezas: c.liqPiezas, kg: c.liqPesoBruto },
      calculado: { fulls: t.fulls, piezas: t.cajas, kg: t.kgs },
    };
  },
};

export const reglaPesoCobrableMinimo: ReglaNegocio = {
  id: 'liquidacion.pesoCobrable',
  nombre: 'Peso cobrable ≥ peso bruto',
  descripcion: 'El peso cobrable del juego normal no puede ser menor que el peso bruto (validación al grabar, R12).',
  evaluar: (c) => {
    const n = c.liquidaciones.find((l) => l.tipo === 'NORMAL');
    if (!n || n.pesoCobrable === null || c.totalKgs === null) return null;
    return {
      ok: n.pesoCobrable + 0.001 >= c.totalKgs,
      esperado: `≥ ${c.totalKgs}`,
      calculado: n.pesoCobrable,
      nota: n.pesoCobrable + 0.001 >= c.totalKgs ? undefined : 'El sistema nuevo no deja grabar esta coordinación.',
    };
  },
};

export const REGLAS_LIQUIDACION: ReglaNegocio[] = [
  reglaJuegoVigente,
  reglaFlete,
  reglaDueCarrier,
  reglaHandling,
  reglaDueAgent,
  reglaTotal,
  reglaCabecera,
  reglaPesoCobrableMinimo,
];
