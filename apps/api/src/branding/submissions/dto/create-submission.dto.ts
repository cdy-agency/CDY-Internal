import { IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
