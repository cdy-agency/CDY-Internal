import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class DeployAgentDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsOptional()
  @IsString()
  territory?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  visitTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leadTarget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesTarget?: number;
}
