import { IsDateString } from 'class-validator';

export class VentureSummaryQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
