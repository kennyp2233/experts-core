import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Input para `/exportador/box_weight_factor_calculator/`. Los nombres de
 * campo siguen exactamente el contrato del portal (snake_case) para
 * pasarlos sin transformar.
 */
export class BoxWeightDto {
  @ApiProperty({ description: 'Full Box', example: 0 })
  @IsInt()
  @Min(0)
  fb_coo: number;

  @ApiProperty({ description: '1/2 (HB)', example: 0 })
  @IsInt()
  @Min(0)
  hb_coo: number;

  @ApiProperty({ description: '1/4 (QB)', example: 0 })
  @IsInt()
  @Min(0)
  qb_coo: number;

  @ApiProperty({ description: '1/8 (EB)', example: 0 })
  @IsInt()
  @Min(0)
  eb_coo: number;
}
