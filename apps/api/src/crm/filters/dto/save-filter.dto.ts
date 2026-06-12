import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SaveFilterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsObject()
  filters!: Record<string, unknown>;
}
