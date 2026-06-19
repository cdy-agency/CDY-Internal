import {
  IsString,
  IsOptional,
  IsArray,
  IsDecimal,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DeliverableItemDto {
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

export class AssignInfluencerDto {
  @IsString()
  influencerId!: string;

  @IsOptional()
  @IsDecimal()
  agreedFee?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliverableItemDto)
  deliverables?: DeliverableItemDto[];
}
