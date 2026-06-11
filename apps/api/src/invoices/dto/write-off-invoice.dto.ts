import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { WriteOffCategory } from '@prisma/client';

export class WriteOffInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsEnum(WriteOffCategory)
  category!: WriteOffCategory;
}
