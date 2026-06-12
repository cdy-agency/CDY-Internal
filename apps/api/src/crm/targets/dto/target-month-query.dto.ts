import { IsOptional, IsString } from 'class-validator';

export class TargetMonthQueryDto {
  @IsOptional()
  @IsString()
  month?: string;
}
