import { EntidadSync } from '../../engine/sync.types';
import { coordinacion } from './coordinaciones';
import { guiaMadre, loteGuias } from './guias';

/**
 * Orden del grupo "documentos": el stock de guías antes que las
 * coordinaciones (cada coordinación apunta a su guía madre). Las FKs a datos
 * maestros se resuelven con la bitácora del grupo "maestros".
 */
export const ENTIDADES_DOCUMENTOS: ReadonlyArray<EntidadSync<any, any, any>> = [
  loteGuias,
  guiaMadre,
  coordinacion,
];
