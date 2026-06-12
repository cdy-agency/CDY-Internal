import { IsArray, IsEnum, IsString, ArrayMaxSize } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  leadIds!: string[];

  @IsString()
  agentId!: string;
}

export class BulkMoveStageDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  leadIds!: string[];

  @IsEnum(PipelineStage)
  stage!: PipelineStage;
}

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  leadIds!: string[];
}
