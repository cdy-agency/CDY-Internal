import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExtendRetainerDto {
  @IsDateString()
  @IsOptional()
  newEndDate?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  newAmount?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
