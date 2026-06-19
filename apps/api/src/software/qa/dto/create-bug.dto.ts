import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { BugSeverity, BugStatus } from '@prisma/client';

export class CreateBugDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BugSeverity)
  severity?: BugSeverity;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

export class UpdateBugStatusDto {
  @IsEnum(BugStatus)
  status!: BugStatus;
}
