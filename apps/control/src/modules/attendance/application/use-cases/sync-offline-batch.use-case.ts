import { Injectable } from '@nestjs/common';
import { RecordEntryUseCase } from './record-entry.use-case';
import { RecordExitUseCase } from './record-exit.use-case';
import { SyncBatchDto, BatchSyncResponseDto, SyncResultDto } from '../dto/sync-batch.dto';
import { AttendanceType } from '../../domain/enums/attendance-type.enum';

@Injectable()
export class SyncOfflineBatchUseCase {
  constructor(
    private readonly recordEntryUseCase: RecordEntryUseCase,
    private readonly recordExitUseCase: RecordExitUseCase,
  ) {}

  async execute(dto: SyncBatchDto, workerId: string): Promise<BatchSyncResponseDto> {
    const results: SyncResultDto[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Procesar registros en orden cronológico
    const sortedRecords = dto.records.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const record of sortedRecords) {
      try {
        // Marcar como registro offline
        record.createdOffline = true;

        let result;
        
        if (record.type === AttendanceType.ENTRY) {
          result = await this.recordEntryUseCase.execute(record, workerId);
        } else if (record.type === AttendanceType.EXIT) {
          result = await this.recordExitUseCase.execute(record, workerId);
        } else {
          throw new Error(`Invalid attendance type: ${record.type}`);
        }

        results.push({
          localId: record.timestamp, // Usar timestamp como ID local
          status: 'SUCCESS',
          recordId: result.recordId,
          validationStatus: result.status,
          fraudScore: result.fraudScore,
        });

        successCount++;
        
      } catch (error) {
        results.push({
          localId: record.timestamp,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });

        errorCount++;

        // Opcionalmente, continuar con el siguiente registro en lugar de fallar todo el lote
        console.warn(`Failed to sync record ${record.timestamp}:`, error);
      }
    }

    return {
      batchId: dto.batchId,
      processedCount: results.length,
      successCount,
      errorCount,
      results,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * Validar que el lote esté en orden cronológico correcto
   */
  private validateBatchOrder(records: any[]): void {
    for (let i = 1; i < records.length; i++) {
      const prevTime = new Date(records[i - 1].timestamp).getTime();
      const currTime = new Date(records[i].timestamp).getTime();
      
      if (currTime < prevTime) {
        throw new Error('Records must be in chronological order');
      }
    }
  }

  /**
   * Validar que no haya duplicados en el lote
   */
  private validateNoDuplicates(records: any[]): void {
    const timestamps = new Set();
    
    for (const record of records) {
      if (timestamps.has(record.timestamp)) {
        throw new Error(`Duplicate timestamp found: ${record.timestamp}`);
      }
      timestamps.add(record.timestamp);
    }
  }

  /**
   * Validar secuencia lógica de entrada/salida
   */
  private validateAttendanceSequence(records: any[]): void {
    let expectingEntry = true;
    
    for (const record of records) {
      if (expectingEntry && record.type !== AttendanceType.ENTRY) {
        throw new Error(`Expected ENTRY but got ${record.type} at ${record.timestamp}`);
      }
      
      if (!expectingEntry && record.type !== AttendanceType.EXIT) {
        throw new Error(`Expected EXIT but got ${record.type} at ${record.timestamp}`);
      }
      
      expectingEntry = !expectingEntry;
    }
  }

  /**
   * Procesar lote con validaciones completas
   */
  async executeWithValidation(dto: SyncBatchDto, workerId: string): Promise<BatchSyncResponseDto> {
    // Validaciones del lote
    this.validateBatchOrder(dto.records);
    this.validateNoDuplicates(dto.records);
    this.validateAttendanceSequence(dto.records);

    // Procesar normalmente
    return this.execute(dto, workerId);
  }

  /**
   * Procesar lote de manera transaccional (todo o nada)
   */
  async executeTransactional(dto: SyncBatchDto, workerId: string): Promise<BatchSyncResponseDto> {
    const results: SyncResultDto[] = [];
    
    try {
      // Procesar todos los registros
      const response = await this.execute(dto, workerId);
      
      // Si hay errores, rollback (en una implementación real)
      if (response.errorCount > 0) {
        // Aquí se haría rollback de los registros exitosos
        throw new Error(`Batch sync failed: ${response.errorCount} errors out of ${response.processedCount} records`);
      }
      
      return response;
    } catch (error) {
      // Rollback logic aquí
      throw error;
    }
  }
}
