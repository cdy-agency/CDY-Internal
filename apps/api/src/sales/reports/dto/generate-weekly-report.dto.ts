import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GenerateWeeklyReportDto {
  @IsNumber()
  @Min(1)
  weekNumber!: number;

  @IsDateString()
  weekStart!: string;

  @IsOptional()
  @IsString()
  highlights?: string;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsString()
  nextWeekPlan?: string;
}
