import { IsOptional, IsDateString } from 'class-validator';

export class BalanceSheetFiltersDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
