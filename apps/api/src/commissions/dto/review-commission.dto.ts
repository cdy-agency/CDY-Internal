import { Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsIn,
  ValidateIf,
} from 'class-validator';

export class ReviewCommissionDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adjustedAmount?: number;

  @ValidateIf((o: ReviewCommissionDto) => o.adjustedAmount !== undefined)
  @IsString()
  adjustmentReason?: string;

  @ValidateIf((o: ReviewCommissionDto) => o.status === 'REJECTED')
  @IsString()
  rejectionReason?: string;
}
