import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';

@Injectable()
export class PhotoStorageService {
  private readonly uploadPath = process.env.PHOTO_UPLOAD_PATH || './uploads/attendance-photos';

  constructor() {
    this.ensureUploadDirectory();
  }

  /**
   * Procesa imagen Base64 y la guarda en storage
   * @param base64Image - Imagen en formato data:image/type;base64,data
   * @param workerId - ID del worker (para organizar carpetas)
   * @returns Path relativo de la imagen guardada
   */
  async processAndSavePhoto(base64Image: string, workerId: string): Promise<string> {
    try {
      // 1. Validar y extraer datos de la imagen Base64
      const { mimeType, imageBuffer, extension } = this.parseBase64Image(base64Image);
      
      // 2. Validar tamaño de imagen (max 10MB)
      if (imageBuffer.length > 10 * 1024 * 1024) {
        throw new BadRequestException('Image size exceeds 10MB limit');
      }

      // 3. Generar nombre único para la imagen
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomSuffix = crypto.randomBytes(4).toString('hex');
      const fileName = `${workerId}_${timestamp}_${randomSuffix}.${extension}`;
      
      // 4. Crear carpeta por worker si no existe
      const workerFolder = join(this.uploadPath, workerId);
      await this.ensureDirectory(workerFolder);
      
      // 5. Guardar imagen
      const filePath = join(workerFolder, fileName);
      await writeFile(filePath, imageBuffer);
      
      // 6. Retornar path relativo (para guardar en BD)
      return `attendance-photos/${workerId}/${fileName}`;
      
    } catch (error) {
      throw new BadRequestException(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Extrae información de imagen Base64
   */
  private parseBase64Image(base64Image: string): {
    mimeType: string;
    imageBuffer: Buffer;
    extension: string;
  } {
    // Formato esperado: data:image/jpeg;base64,/9j/4AAQ...
    const matches = base64Image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new BadRequestException('Invalid base64 image format');
    }

    const mimeType = `image/${matches[1]}`;
    const base64Data = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    // Mapear extensión
    const extensionMap: Record<string, string> = {
      'jpeg': 'jpg',
      'jpg': 'jpg', 
      'png': 'png',
      'gif': 'gif',
      'webp': 'webp'
    };
    
    const extension = extensionMap[matches[1].toLowerCase()];
    if (!extension) {
      throw new BadRequestException(`Unsupported image type: ${matches[1]}`);
    }

    return { mimeType, imageBuffer, extension };
  }

  /**
   * Asegura que el directorio de uploads existe
   */
  private async ensureUploadDirectory(): Promise<void> {
    await this.ensureDirectory(this.uploadPath);
  }

  /**
   * Crea directorio si no existe
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Obtiene información de la imagen desde Base64 sin guardarla
   */
  getImageInfo(base64Image: string): {
    size: number;
    mimeType: string;
    extension: string;
  } {
    const { mimeType, imageBuffer, extension } = this.parseBase64Image(base64Image);
    
    return {
      size: imageBuffer.length,
      mimeType,
      extension
    };
  }
}
