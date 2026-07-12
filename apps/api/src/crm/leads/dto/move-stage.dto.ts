import { IsEmail, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  /** Required when closing as Closed Won — the confirmed final deal value,
   * which drives the invoice/retainer amount and commission calculation
   * instead of the lead's (possibly stale) original estimated value. */
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  finalValue?: number;

  // Optional corrections to the lead's contact info, applied at close time
  // and carried into the client record that gets created/linked.
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
