import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSalesCampaignDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  productService!: string;

  @IsOptional()
  @IsString()
  territory?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  visitTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesTarget?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
