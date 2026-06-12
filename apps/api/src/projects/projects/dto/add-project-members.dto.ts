import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddProjectMembersDto {
  @IsArray()
  @IsString({ each: true })
  employeeIds!: string[];
}
