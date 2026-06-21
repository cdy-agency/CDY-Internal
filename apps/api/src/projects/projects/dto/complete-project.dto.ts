import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteProjectDto {
  @IsOptional()
  @IsBoolean()
  acknowledgeIncompleteTasks?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  completionNotes?: string;
}
