import { Injectable } from '@nestjs/common';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { AttendanceProcessingService } from '../services/attendance-processing.service';

@Injectable()
export class RecordEntryUseCase {
  constructor(
    private readonly attendanceProcessingService: AttendanceProcessingService,
  ) {}

  async execute(dto: RecordAttendanceDto, workerId: string, depotId: string, deviceId: string): Promise<AttendanceResponseDto> {
    console.log('[RecordEntryUseCase] 🚀 Ejecutando caso de uso - Registro de Entrada');
    console.log('[RecordEntryUseCase] Parámetros:', { workerId, depotId, deviceId, type: 'ENTRY' });
    
    try {
      const result = await this.attendanceProcessingService.processAttendanceRecord(
        dto,
        workerId,
        depotId,
        deviceId,
        AttendanceType.ENTRY,
      );
      
      console.log('[RecordEntryUseCase] ✅ Caso de uso completado exitosamente');
      return result;
    } catch (error) {
      console.error('[RecordEntryUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }
}
