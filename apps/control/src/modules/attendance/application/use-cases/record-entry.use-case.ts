import { Injectable, Logger } from '@nestjs/common';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';
import { RecordAttendanceDto } from '../dto/record-attendance.dto';
import { AttendanceResponseDto } from '../dto/attendance-response.dto';
import { AttendanceProcessingService } from '../services/attendance-processing.service';

@Injectable()
export class RecordEntryUseCase {
  private readonly logger = new Logger(RecordEntryUseCase.name);

  constructor(
    private readonly attendanceProcessingService: AttendanceProcessingService,
  ) {}

  async execute(dto: RecordAttendanceDto, workerId: string, depotId: string, deviceId: string): Promise<AttendanceResponseDto> {
    this.logger.log('🚀 Ejecutando caso de uso - Registro de Entrada');
    this.logger.debug('Parámetros:', { workerId, depotId, deviceId, type: 'ENTRY' });
    
    try {
      const result = await this.attendanceProcessingService.processAttendanceRecord(
        dto,
        workerId,
        depotId,
        deviceId,
        AttendanceType.ENTRY,
      );
      
      this.logger.log('✅ Caso de uso completado exitosamente');
      return result;
    } catch (error) {
      this.logger.error('❌ Error en caso de uso:', error);
      throw error;
    }
  }
}
