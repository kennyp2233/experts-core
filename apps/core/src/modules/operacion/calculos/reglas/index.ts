import { REGLAS_LIQUIDACION } from './liquidacion';
import { REGLAS_TOTALES } from './totales';
import { ReglaNegocio } from './tipos';

/** Todas las reglas de negocio que se validan contra el sistema viejo. */
export const REGLAS: ReglaNegocio[] = [...REGLAS_TOTALES, ...REGLAS_LIQUIDACION];
