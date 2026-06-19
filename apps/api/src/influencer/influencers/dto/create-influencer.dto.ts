import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class CreateInfluencerDto {
  @IsString()
  name!: string;

  @IsString()
  handle!: string;

  @IsString()
  platform!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherPlatforms?: string[];

  @IsOptional()
  @IsInt()
  followersCount?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
