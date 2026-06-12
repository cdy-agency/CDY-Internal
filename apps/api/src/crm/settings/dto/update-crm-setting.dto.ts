import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateCrmSettingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  value!: string;
}
