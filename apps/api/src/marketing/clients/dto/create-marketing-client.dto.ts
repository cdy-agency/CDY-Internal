import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMarketingClientDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  retainerId?: string;

  @IsArray()
  @IsString({ each: true })
  platforms!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  postsPerMonth?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMarketingClientDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  postsPerMonth?: number;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  retainerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
