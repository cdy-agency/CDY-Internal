import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateDeliverableDto {
  @IsString()
  description!: string;

  @IsString()
  platform!: string;

  @IsString()
  contentType!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
