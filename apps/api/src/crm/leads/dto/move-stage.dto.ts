import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class MoveStageDto {
  @IsEnum(PipelineStage)
  stage!: PipelineStage;

  @IsOptional()
  @IsString()
  lostReason?: string;
}
