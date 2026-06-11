import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetIncreaseRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  requestedBudget!: number;

  @IsString()
  @IsNotEmpty()
  justification!: string;

  @IsOptional()
  @IsString()
  requesterName?: string;
}
