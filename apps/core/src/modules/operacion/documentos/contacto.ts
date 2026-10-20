/**
 * Teléfonos y correos de Experts como salen al pie de los documentos: los de las
 * plantillas más nuevas del sistema viejo (reservas de KLM, Qatar y Masair; las
 * de Atlas o Emirates tienen números de antes). Se cambian con
 * REPORTE_CONTACTO, renglones separados por "|".
 */
export const contactoExperts = (): string[] =>
  (
    process.env.REPORTE_CONTACTO ||
    'TELEFONO : 023526170|CELULAR: 0960058635|Mail: manager@expertshcargo.com|Mail: coordination@expertshcargo.com|Mail: expertshcargosa@gmail.com'
  )
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
