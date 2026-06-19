import { IsString, IsOptional } from 'class-validator';

export class UpdateDesignPhaseDto {
  @IsOptional()
  @IsString()
  figmaUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
