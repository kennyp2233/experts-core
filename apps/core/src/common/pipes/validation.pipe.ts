import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  private readonly logger = new Logger(CustomValidationPipe.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.metatype || !this.toValidate(metadata.metatype)) {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          const constraints = Object.values(error.constraints || {});
          return `${error.property}: ${constraints.join(', ')}`;
        })
        .join('; ');

      // En producción, no logear detalles de validación que puedan contener datos sensibles
      if (this.isProduction) {
        this.logger.warn(`Validation failed for ${metadata.metatype.name}`);
      } else {
        this.logger.warn(`Validation failed: ${errorMessages}`);
      }

      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        })),
      });
    }

    return object;
  }

  private toValidate(type: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(type);
  }
}
