import { IsString, IsNotEmpty, MaxLength, IsOptional, Length } from 'class-validator';

export class CreateVentureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  color?: string;
}
