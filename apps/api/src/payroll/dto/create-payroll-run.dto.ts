import { IsNotEmpty, IsOptional, IsArray, IsString, Matches } from 'class-validator';

export class CreatePayrollRunDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];
}
