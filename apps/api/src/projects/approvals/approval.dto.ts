import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestApprovalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export enum ApprovalDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class RecordApprovalDto {
  @IsEnum(ApprovalDecision)
  decision!: ApprovalDecision;

  @ValidateIf((o: RecordApprovalDto) => o.decision === ApprovalDecision.REJECT)
  @IsString()
  @IsNotEmpty()
  note?: string;
}

export class SetHourlyRateDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePerHour!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateHourlyRateDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ratePerHour!: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class WorkloadFiltersDto {
  @IsOptional()
  @IsString()
  departmentId?: string;
}
