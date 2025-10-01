import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UseInterceptors
} from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { ExceptionCodeService } from '../../application/services/exception-code.service';
import { GenerateExceptionCodeDto } from '../../application/dto/generate-exception-code.dto';
import type { ValidateExceptionCodeDto } from '../../application/use-cases/validate-exception-code.use-case';
import type { ListExceptionCodesDto } from '../../application/use-cases/list-exception-codes.use-case';
import { JwtGuard } from '../../../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../../../auth/guards/roles.guard';

@Controller('exception-codes')
@UseInterceptors(ClassSerializerInterceptor)
export class ExceptionCodesController {
  constructor(
    private readonly exceptionCodeService: ExceptionCodeService,
  ) {}

  @Post('generate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  @HttpCode(HttpStatus.CREATED)
  async generateExceptionCode(
    @Body(ValidationPipe) dto: GenerateExceptionCodeDto,
    @Request() req
  ) {
    return this.exceptionCodeService.generateExceptionCode(dto, req.user.id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateExceptionCode(@Body(ValidationPipe) dto: ValidateExceptionCodeDto) {
    return this.exceptionCodeService.validateExceptionCode(dto);
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'SUPERVISOR')
  async listExceptionCodes(@Request() req) {
    const dto: ListExceptionCodesDto = {
      adminId: req.user.id,
    };
    return this.exceptionCodeService.listExceptionCodes(dto);
  }
}