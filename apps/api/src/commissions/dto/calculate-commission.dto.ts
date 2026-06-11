import { Type } from 'class-transformer';
import { IsString, IsNumber, Min } from 'class-validator';

export class CalculateCommissionDto {
  @IsString()
  agentId!: string;

  @IsString()
  dealId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dealValue!: number;

  @IsString()
  serviceType!: string;
}
