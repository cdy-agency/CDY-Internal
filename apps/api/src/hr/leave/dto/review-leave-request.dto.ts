import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewLeaveRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
