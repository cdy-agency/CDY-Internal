import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum BudgetReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewBudgetRequestDto {
  @IsEnum(BudgetReviewAction)
  action!: BudgetReviewAction;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
