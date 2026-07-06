import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class MoveStageDto {
  @IsEnum(PipelineStage)
  stage!: PipelineStage;

  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsIn(['invoice', 'retainer'])
  wonOutcome?: 'invoice' | 'retainer';
}
