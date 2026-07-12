import { PartialType } from '@nestjs/mapped-types';
import { CreateDirectIncomeDto } from './create-direct-income.dto';

export class UpdateDirectIncomeDto extends PartialType(CreateDirectIncomeDto) {}
