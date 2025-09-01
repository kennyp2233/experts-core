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

  async execute(dto: RecordAttendanceDto, workerId: string, depotId: string): Promise<AttendanceResponseDto> {
    return await this.attendanceProcessingService.processAttendanceRecord(
      dto,
      workerId,
      depotId,
      AttendanceType.ENTRY,
    );
  }
}
