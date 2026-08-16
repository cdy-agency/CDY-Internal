import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { CompanyAccountType } from '@prisma/client';

export class CreateCompanyAccountDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(CompanyAccountType)
  type!: CompanyAccountType;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
