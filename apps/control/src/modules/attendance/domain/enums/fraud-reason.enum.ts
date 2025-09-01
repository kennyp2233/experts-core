export enum FraudReason {
  // Temporal violations
  QR_EXPIRED = 'QR_EXPIRED',
  QR_FROM_FUTURE = 'QR_FROM_FUTURE',
  
  // Cryptographic violations
  INVALID_QR_SIGNATURE = 'INVALID_QR_SIGNATURE',
  MALFORMED_QR_CODE = 'MALFORMED_QR_CODE',
  
  // Geolocation violations
  LOCATION_OUT_OF_RANGE = 'LOCATION_OUT_OF_RANGE',
  GPS_ACCURACY_TOO_LOW = 'GPS_ACCURACY_TOO_LOW',
  IMPOSSIBLE_TRAVEL_SPEED = 'IMPOSSIBLE_TRAVEL_SPEED',
  
  // Photo violations
  PHOTO_MISSING_METADATA = 'PHOTO_MISSING_METADATA',
  PHOTO_TIMESTAMP_MISMATCH = 'PHOTO_TIMESTAMP_MISMATCH',
  PHOTO_NOT_RECENT = 'PHOTO_NOT_RECENT',
  SUSPECTED_SCREENSHOT = 'SUSPECTED_SCREENSHOT',
  
  // Pattern violations
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  MISSING_EXIT_PREVIOUS_DAY = 'MISSING_EXIT_PREVIOUS_DAY',
  INVALID_SHIFT_SEQUENCE = 'INVALID_SHIFT_SEQUENCE',
  UNUSUAL_WORK_HOURS = 'UNUSUAL_WORK_HOURS',
  
  // Device violations
  UNKNOWN_DEVICE = 'UNKNOWN_DEVICE',
  DEVICE_TIME_MISMATCH = 'DEVICE_TIME_MISMATCH',
}

export const FRAUD_REASON_VALUES = Object.values(FraudReason);

export const FRAUD_REASON_DESCRIPTIONS: Record<FraudReason, string> = {
  [FraudReason.QR_EXPIRED]: 'QR code has expired (tolerance: 6 minutes)',
  [FraudReason.QR_FROM_FUTURE]: 'QR code timestamp is from the future',
  [FraudReason.INVALID_QR_SIGNATURE]: 'QR code signature validation failed',
  [FraudReason.MALFORMED_QR_CODE]: 'QR code format is invalid',
  [FraudReason.LOCATION_OUT_OF_RANGE]: 'Location is outside depot geofence',
  [FraudReason.GPS_ACCURACY_TOO_LOW]: 'GPS accuracy is insufficient for validation',
  [FraudReason.IMPOSSIBLE_TRAVEL_SPEED]: 'Travel speed between records is impossible',
  [FraudReason.PHOTO_MISSING_METADATA]: 'Photo is missing required camera metadata',
  [FraudReason.PHOTO_TIMESTAMP_MISMATCH]: 'Photo timestamp does not match record time',
  [FraudReason.PHOTO_NOT_RECENT]: 'Photo was not taken recently',
  [FraudReason.SUSPECTED_SCREENSHOT]: 'Photo appears to be a screenshot',
  [FraudReason.DUPLICATE_ENTRY]: 'Worker already has an active entry for today',
  [FraudReason.MISSING_EXIT_PREVIOUS_DAY]: 'Worker has no exit record for previous work day',
  [FraudReason.INVALID_SHIFT_SEQUENCE]: 'Invalid sequence of entry/exit records',
  [FraudReason.UNUSUAL_WORK_HOURS]: 'Work hours pattern is unusual for this worker',
  [FraudReason.UNKNOWN_DEVICE]: 'Device is not registered for this worker',
  [FraudReason.DEVICE_TIME_MISMATCH]: 'Device time differs significantly from server time',
};
