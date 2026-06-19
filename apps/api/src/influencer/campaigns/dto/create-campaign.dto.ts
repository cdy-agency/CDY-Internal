import {
  IsString,
  IsOptional,
  IsArray,
  IsDecimal,
  IsDateString,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  clientId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsArray()
  @IsString({ each: true })
  platforms!: string[];

  @IsOptional()
  @IsDecimal()
  budget?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
