import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CashFlowFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(52)
  weeks?: number = 13;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number = 0;
}
