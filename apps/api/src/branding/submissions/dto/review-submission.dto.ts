import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReviewSubmissionDto {
  @IsEnum(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  clientFeedback?: string;
}
