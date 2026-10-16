/**
 * Números de guía aérea (AWB) IATA: prefijo de 3 dígitos de la aerolínea +
 * serial de 7 dígitos + dígito verificador (serial mod 7). Ej. 369-8469546 1.
 * Las 12.615 guías del sistema viejo cumplen la regla.
 */

export interface Awb {
  prefijo: number;
  /** Serial de 7 dígitos, sin el verificador. */
  serial: number;
  verificador: number;
}

export const digitoVerificador = (serial: number) => serial % 7;

/** "369-84695461" (clave interna, igual que la del sync). */
export const awbClave = (a: Awb) =>
  `${String(a.prefijo).padStart(3, '0')}-${String(a.serial).padStart(7, '0')}${a.verificador}`;

/** "369-8469 5461" (como se imprime y como lo guarda el sistema viejo). */
export const awbTexto = (a: Awb) => {
  const ocho = `${String(a.serial).padStart(7, '0')}${a.verificador}`;
  return `${String(a.prefijo).padStart(3, '0')}-${ocho.slice(0, 4)} ${ocho.slice(4)}`;
};

/**
 * Interpreta un serial escrito por el usuario: 8 dígitos (con verificador, se
 * valida) o 7 (se calcula el verificador).
 */
export function parsearSerial(texto: string): { serial: number; error?: string } {
  const d = texto.replace(/\D/g, '');
  if (d.length === 7) return { serial: Number(d) };
  if (d.length === 8) {
    const serial = Number(d.slice(0, 7));
    const v = Number(d.slice(7));
    return v === digitoVerificador(serial)
      ? { serial }
      : { serial, error: `El dígito verificador de ${d} debería ser ${digitoVerificador(serial)} (serial mod 7).` };
  }
  return { serial: NaN, error: 'El número de guía debe tener 8 dígitos (o 7 sin el verificador).' };
}

/** `cantidad` guías consecutivas a partir de `serial`. */
export function rangoAwb(prefijo: number, serial: number, cantidad: number): Awb[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const s = serial + i;
    return { prefijo, serial: s, verificador: digitoVerificador(s) };
  });
}
