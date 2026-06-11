import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateCashFlowAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['IN', 'OUT'])
  direction!: 'IN' | 'OUT';

  @IsDateString()
  date!: string;
}
