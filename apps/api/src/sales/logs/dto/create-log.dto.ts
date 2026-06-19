import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDailyLogDto {
  @IsString()
  @IsNotEmpty()
  campaignId!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  visitsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  challenges?: string;
}
