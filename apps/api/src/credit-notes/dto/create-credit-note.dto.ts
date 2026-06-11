import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsEnum,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreditNoteReason, CreditNoteStatus } from '@prisma/client';

export class CreateCreditNoteDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(CreditNoteReason)
  reason!: CreditNoteReason;

  @IsString()
  @IsNotEmpty()
  description!: string;
}

export class CreditNoteFiltersDto {
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(CreditNoteStatus)
  status?: CreditNoteStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;
}
