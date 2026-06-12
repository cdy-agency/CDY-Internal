import { IsOptional, IsString } from 'class-validator';

export class ConversionFiltersDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
