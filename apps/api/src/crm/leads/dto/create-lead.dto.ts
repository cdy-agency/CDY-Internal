import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientType, LeadSource } from '@prisma/client';

export class CreateLeadDto {
  @IsOptional()
  @IsEnum(ClientType)
  leadType?: ClientType;

  @IsString()
  @IsNotEmpty()
  contactName!: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  serviceInterest?: string;

  @IsOptional()
  @IsString()
  ventureId?: string;

  @IsEnum(LeadSource)
  source!: LeadSource;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Optional lead creation date (YYYY-MM-DD or ISO). Defaults to now. */
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
