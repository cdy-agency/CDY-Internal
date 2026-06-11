import { IsString, IsNotEmpty } from 'class-validator';

export class PauseRetainerDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
