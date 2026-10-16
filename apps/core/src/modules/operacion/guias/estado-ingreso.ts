import type { Prisma } from '@internal/documentos-client';
import { modoOperacion } from '../comun/modo-operacion';

type EstadoIngreso = 'INGRESADO' | 'GUIAS_COORDINADAS' | 'CANCELADO';

/**
 * Estado del ingreso de guías según sus guías, como el sistema viejo
 * (ITSSystem.Proc_66F650; umbrales confirmados con los documentos 2019–2026):
 * CANCELADO = todas usadas (coordinadas, o prestadas y devueltas);
 * GUIAS COORDINADAS = alguna coordinada sin estar todas usadas;
 * INGRESADO = ninguna coordinada (una prestada sin devolver lo deja abierto).
 * "Cancelado" es "agotado", no "anulado".
 */
export function estadoSegunGuias(
  guias: Array<{ estado: string | null; devolucion: boolean | null }>,
): EstadoIngreso {
  const vigentes = guias.filter((g) => g.estado !== 'ANULADA');
  const usada = (g: (typeof vigentes)[number]) => g.estado === 'COORDINADA' || (g.estado === 'PRESTADA' && !!g.devolucion);
  if (vigentes.length > 0 && vigentes.every(usada)) return 'CANCELADO';
  return vigentes.some((g) => g.estado === 'COORDINADA') ? 'GUIAS_COORDINADAS' : 'INGRESADO';
}

/**
 * Recalcula y guarda el estado de los ingresos dados (los del sistema nuevo;
 * los del viejo traen su estado con el sync mientras ese sistema mande). Se
 * llama dentro de la transacción que cambió alguna guía.
 */
export async function recalcularEstadoIngresos(
  tx: Prisma.TransactionClient,
  ids: Iterable<number | null | undefined>,
): Promise<void> {
  const unicos = [...new Set([...ids].filter((x): x is number => typeof x === 'number'))];
  for (const id of unicos) {
    const doc = await tx.documentoBase.findUnique({
      where: { id },
      select: { codigoAccess: true, estado: true, guiasMadre: { select: { estado: true, devolucion: true } } },
    });
    if (!doc || doc.estado === 'ANULADO') continue;
    if (doc.codigoAccess !== null && modoOperacion() === 'sombra') continue;
    const estado = estadoSegunGuias(doc.guiasMadre);
    if (estado !== doc.estado) await tx.documentoBase.update({ where: { id }, data: { estado } });
  }
}
