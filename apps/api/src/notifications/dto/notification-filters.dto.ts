import { IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class NotificationFiltersDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;
}
