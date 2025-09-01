export enum RecordStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  SUSPICIOUS = 'SUSPICIOUS',
}

export const RECORD_STATUS_VALUES = Object.values(RecordStatus);
