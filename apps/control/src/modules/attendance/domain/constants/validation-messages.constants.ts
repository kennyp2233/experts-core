/**
 * Mensajes estandarizados para validaciones anti-fraude
 * Centraliza todos los mensajes del sistema de validación
 */

export const VALIDATION_MESSAGES = {
  // ============================================
  // TEMPORAL VALIDATION MESSAGES
  // ============================================
  TEMPORAL: {
    QR_EXPIRED: (minutes: number, tolerance: number) =>
      `Código QR expirado por ${minutes} minutos (tolerancia: ${tolerance} min)`,

    QR_FROM_FUTURE: (minutes: number, tolerance: number) =>
      `Código QR del futuro por ${minutes} minutos (tolerancia: ${tolerance} min)`,

    QR_CLOSE_TO_EXPIRATION: (minutes: number) =>
      `Código QR cerca de expirar (${minutes} minutos de antigüedad)`,

    QR_VALID: () =>
      'Validación de tiempo del QR exitosa',

    DEVICE_TIME_MISMATCH: (minutes: number, tolerance: number) =>
      `Tiempo del dispositivo difiere por ${minutes} minutos del servidor (tolerancia: ${tolerance} min)`,

    DEVICE_TIME_VALID: () =>
      'Validación de tiempo del dispositivo exitosa',

    RECORD_TOO_CLOSE: (minutes: number, minInterval: number) =>
      `Registro muy cercano al anterior (${minutes} minutos, mínimo: ${minInterval} min)`,

    RECORD_IN_PAST: () =>
      'Timestamp del registro es anterior al último registro',

    RECORD_SEQUENCE_VALID: () =>
      'Validación de secuencia de registros exitosa',

    FIRST_RECORD: () =>
      'Primer registro del trabajador',

    WORKING_HOURS_OUTSIDE_RANGE: (time: string, type: string, expectedRange: string) =>
      `Hora de ${type} fuera del rango normal (${time}, esperado: ${expectedRange})`,

    WORKING_HOURS_VERY_UNUSUAL: (time: string) =>
      `Hora muy inusual para este tipo de registro (${time})`,

    WORKING_HOURS_VALID: () =>
      'Validación de horario laboral exitosa',

    NO_SCHEDULE_CONFIGURED: () =>
      'No hay horario configurado para este trabajador',

    OUTSIDE_SCHEDULE_STRICT: (time: string, window: string) =>
      `Registro fuera del horario permitido (${time}, permitido: ${window})`,

    OUTSIDE_SCHEDULE_FLEXIBLE: (time: string, window: string) =>
      `Registro fuera del horario usual pero permitido (${time}, usual: ${window})`,

    WITHIN_SCHEDULE: () =>
      'Registro dentro del horario permitido',
  },

  // ============================================
  // CRYPTOGRAPHIC VALIDATION MESSAGES
  // ============================================
  CRYPTOGRAPHIC: {
    EXCEPTION_CODE_USED: () =>
      'Registro usando código de excepción - validación criptográfica omitida',

    NO_QR_PROVIDED: () =>
      'No se proporcionó código QR ni código de excepción',

    MALFORMED_QR: () =>
      'Formato de código QR inválido - falta la firma',

    INVALID_SIGNATURE: (qrSignature: string, depotId: string) =>
      `Firma criptográfica del QR inválida (firma: ${qrSignature.substring(0, 16)}..., depot: ${depotId})`,

    SIGNATURE_VALID: () =>
      'Validación criptográfica del QR exitosa',

    QR_PARSE_ERROR: (error: string) =>
      `Error al procesar código QR: ${error}`,
  },

  // ============================================
  // GEOLOCATION VALIDATION MESSAGES
  // ============================================
  GEOLOCATION: {
    GPS_ACCURACY_TOO_LOW: (accuracy: number, maxAcceptable: number) =>
      `Precisión GPS muy baja: ${accuracy}m (máximo aceptable: ${maxAcceptable}m)`,

    GPS_EXCELLENT: () =>
      'Precisión GPS excelente',

    GPS_GOOD: () =>
      'Precisión GPS buena',

    GPS_ACCEPTABLE: () =>
      'Precisión GPS aceptable',

    GPS_POOR: () =>
      'Precisión GPS pobre pero usable',

    LOCATION_OUT_OF_RANGE: (distance: number, baseRadius: number, tolerance: number) =>
      `Ubicación a ${distance}m del depósito (máximo: ${baseRadius}m + ${tolerance}m tolerancia GPS)`,

    LOCATION_TOO_CLOSE_TO_CENTER: (distance: number) =>
      `Ubicación sospechosamente cerca del centro del depósito (${distance}m)`,

    LOCATION_VALID: () =>
      'Validación de ubicación exitosa',

    COORDINATES_NULL_ISLAND: () =>
      'Coordenadas en la isla nula (0,0) - probablemente error de GPS o falsificación',

    COORDINATES_LOW_PRECISION: () =>
      'Coordenadas con muy baja precisión - podrían haber sido ingresadas manualmente',

    COORDINATES_OUT_OF_BOUNDS: () =>
      'Coordenadas fuera de los límites geográficos válidos',

    COORDINATES_VALID: () =>
      'Validación de realismo de coordenadas exitosa',

    TRAVEL_SPEED_IMPOSSIBLE: (speed: number, maxSpeed: number) =>
      `Velocidad de viaje imposible: ${speed} km/h (máximo: ${maxSpeed} km/h)`,

    TRAVEL_SPEED_SUSPICIOUS: (speed: number) =>
      `Velocidad de viaje alta: ${speed} km/h`,

    TRAVEL_SPEED_VALID: () =>
      'Validación de velocidad de viaje exitosa',

    FIRST_LOCATION: () =>
      'Primer registro de ubicación del trabajador',
  },

  // ============================================
  // PHOTO VALIDATION MESSAGES
  // ============================================
  PHOTO: {
    NO_METADATA: (isOffline: boolean) =>
      isOffline
        ? 'No se proporcionaron metadatos de la foto (registro offline)'
        : 'No se proporcionaron metadatos de la foto',

    METADATA_INVALID: (error: string) =>
      `Validación de metadatos de foto falló: ${error}`,

    MISSING_CAMERA_INFO: () =>
      'Foto sin metadatos de cámara - podría ser captura de pantalla',

    INCOMPLETE_CAMERA_INFO: () =>
      'Metadatos de cámara incompletos',

    CAMERA_METADATA_VALID: () =>
      'Validación de metadatos de cámara exitosa',

    TIMESTAMP_MISMATCH: (diffMinutes: number, tolerance: number) =>
      `Timestamp de foto difiere por ${diffMinutes} minutos del tiempo de registro (tolerancia: ${tolerance} min)`,

    TIMESTAMP_VALID: () =>
      'Validación de timestamp de foto exitosa',

    FILE_TOO_SMALL: (size: number) =>
      `Tamaño de archivo muy pequeño: ${size} bytes`,

    FILE_TOO_LARGE: (size: number) =>
      `Tamaño de archivo muy grande: ${size} bytes`,

    RESOLUTION_TOO_LOW: (width: number, height: number) =>
      `Resolución muy baja: ${width}x${height}`,

    UNUSUAL_ASPECT_RATIO: (ratio: number) =>
      `Relación de aspecto inusual: ${ratio}`,

    CHARACTERISTICS_VALID: () =>
      'Validación de características de foto exitosa',

    SUSPECTED_SCREENSHOT: () =>
      'La foto parece ser una captura de pantalla',

    HIGH_SUSPICION_SCORE: (score: number) =>
      `Foto con alto índice de sospecha: ${score}`,

    SCREENSHOT_DETECTION_PASSED: () =>
      'Detección de captura de pantalla exitosa',

    NOT_RECENT: (ageMinutes: number, tolerance: number) =>
      `Foto no es reciente: tomada hace ${ageMinutes} minutos (tolerancia: ${tolerance} min)`,

    RECENCY_VALID: () =>
      'Validación de recencia de foto exitosa',

    ALL_VALIDATIONS_PASSED: () =>
      'Todas las validaciones de foto exitosas',

    MULTIPLE_ISSUES: (count: number) =>
      `Múltiples problemas con la foto (${count} issues)`,
  },

  // ============================================
  // PATTERN VALIDATION MESSAGES
  // ============================================
  PATTERN: {
    DUPLICATE_ENTRY: (lastEntryTime: string) =>
      `El trabajador ya tiene un registro de entrada para hoy (última entrada: ${lastEntryTime})`,

    MISSING_EXIT_PREVIOUS_DAY: (missingDate: string) =>
      `El trabajador no registró salida el día ${missingDate}`,

    ENTRY_PATTERN_VALID: () =>
      'Validación de patrón de entrada exitosa',

    EXIT_WITHOUT_ENTRY: () =>
      'Salida sin entrada correspondiente para hoy',

    SHIFT_TOO_SHORT: (hours: number) =>
      `Turno muy corto: ${hours} horas`,

    SHIFT_TOO_LONG: (hours: number) =>
      `Turno muy largo: ${hours} horas`,

    EXIT_PATTERN_VALID: () =>
      'Validación de patrón de salida exitosa',

    HISTORY_TOO_MANY_SUSPICIOUS: (count: number, total: number) =>
      `El trabajador tiene ${count} registros sospechosos en sus últimos ${total} registros`,

    HISTORY_VALID: () =>
      'Validación de historial de asistencia exitosa',

    DEVICE_NOT_REGISTERED: () =>
      'Dispositivo no registrado para este trabajador',

    DEVICE_VALID: () =>
      'Dispositivo registrado y válido',
  },

  // ============================================
  // GENERAL VALIDATION MESSAGES
  // ============================================
  GENERAL: {
    ALL_VALIDATIONS_PASSED: () =>
      'Todas las validaciones pasaron exitosamente',

    VALIDATION_SUMMARY: (action: string, issues: string, score: number) =>
      `${action}: ${issues} (Score: ${score}/100)`,

    EXCEPTION_CODE_LIMITED_VALIDATION: () =>
      'Registro usando código de excepción - validación temporal limitada',
  },

  // ============================================
  // USER-FACING MESSAGES (Para trabajadores)
  // ============================================
  USER_FACING: {
    ENTRY_SUCCESS: () =>
      'Entrada registrada exitosamente',

    EXIT_SUCCESS: () =>
      'Salida registrada exitosamente',

    PENDING_PROCESSING: () =>
      'Registro pendiente de procesamiento',
  },
} as const;

/**
 * Tipo helper para extraer tipos de las funciones de mensajes
 */
export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGES;

/**
 * Helper para obtener mensaje con type safety
 */
export function getValidationMessage<
  Category extends ValidationMessageKey,
  MessageKey extends keyof typeof VALIDATION_MESSAGES[Category]
>(
  category: Category,
  messageKey: MessageKey,
  ...args: any[]
): string {
  const messageGetter = VALIDATION_MESSAGES[category][messageKey];

  if (typeof messageGetter === 'function') {
    return messageGetter(...args);
  }

  return messageGetter as unknown as string;
}
