import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ClientService, ClientSource, ClientType } from '@prisma/client';

export class CreateDirectClientDto {
  @IsEnum(ClientType)
  clientType!: ClientType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsString()
  @IsNotEmpty()
  contactName!: string;

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
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsEnum(ClientSource)
  source?: ClientSource;

  @IsEnum(ClientService)
  primaryService!: ClientService;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceValue?: number;

  @IsOptional()
  @IsString()
  serviceCurrency?: string;

  @IsOptional()
  @IsString()
  ventureId?: string;
}
