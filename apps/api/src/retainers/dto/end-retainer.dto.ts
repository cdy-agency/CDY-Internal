import { IsString, IsNotEmpty } from 'class-validator';

export class EndRetainerDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
