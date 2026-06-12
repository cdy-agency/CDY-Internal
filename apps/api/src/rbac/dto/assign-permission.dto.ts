import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SinglePermissionDto {
  @IsString()
  @IsNotEmpty()
  featureId!: string;

  @IsBoolean()
  canRead!: boolean;

  @IsBoolean()
  canWrite!: boolean;
}

export class AssignPermissionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SinglePermissionDto)
  permissions!: SinglePermissionDto[];
}
