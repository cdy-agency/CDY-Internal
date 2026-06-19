import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceFiltersDto {
  @IsOptional()
  @Transform(({ value }: { value: string | string[] | undefined }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map((s) => s.trim());
    }
    return value;
  })
  @IsEnum(InvoiceStatus, { each: true })
  status?: InvoiceStatus | InvoiceStatus[];

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  ventureId?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
