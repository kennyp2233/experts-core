import { Injectable } from '@nestjs/common';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { AttendanceProcessingService } from '../services/attendance-processing.service';

@Injectable()
export class RecordExitUseCase {
  constructor(
    private readonly attendanceProcessingService: AttendanceProcessingService,
  ) {}

  async execute(dto: RecordAttendanceDto, workerId: string, depotId: string, deviceId: string): Promise<AttendanceResponseDto> {
    console.log('[RecordExitUseCase] 🚀 Ejecutando caso de uso - Registro de Salida');
    console.log('[RecordExitUseCase] Parámetros:', { workerId, depotId, deviceId, type: 'EXIT' });
    
    try {
      const result = await this.attendanceProcessingService.processAttendanceRecord(
        dto,
        workerId,
        depotId,
        deviceId,
        AttendanceType.EXIT,
      );
      
      console.log('[RecordExitUseCase] ✅ Caso de uso completado exitosamente');
      return result;
    } catch (error) {
      console.error('[RecordExitUseCase] ❌ Error en caso de uso:', error);
      throw error;
    }
  }
}