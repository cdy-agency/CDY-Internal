import { IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  headId?: string;
}
