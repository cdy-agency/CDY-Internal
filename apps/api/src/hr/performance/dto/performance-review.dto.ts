import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePerformanceReviewDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  reviewerId!: string;

  @IsString()
  @IsNotEmpty()
  period!: string;

  @IsDateString()
  reviewDate!: string;

  @IsOptional()
  @IsArray()
  goalsSet?: object[];

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}

export class SelfAssessmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  selfAssessment!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  selfRating!: number;
}

export class CompleteReviewDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  managerNotes!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  improvements?: string;

  @IsOptional()
  @IsArray()
  nextPeriodGoals?: object[];

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}
