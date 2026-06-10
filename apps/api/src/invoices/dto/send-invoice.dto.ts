import { IsEmail, IsOptional } from 'class-validator';

export class SendInvoiceDto {
  @IsOptional()
  @IsEmail()
  clientEmail?: string;
}
