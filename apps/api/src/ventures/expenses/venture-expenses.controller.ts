import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VentureExpensesService } from './venture-expenses.service';
import { CreateVentureExpenseDto } from './dto/create-venture-expense.dto';
import { VentureExpenseFiltersDto } from './dto/venture-expense-filters.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('ventures')
@ApiBearerAuth()
@Controller('ventures/:id/expenses')
export class VentureExpensesController {
  constructor(private readonly expensesService: VentureExpensesService) {}

  @Post()
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Log venture expense' })
  async create(
    @Param('id') ventureId: string,
    @Body() dto: CreateVentureExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.expensesService.create(ventureId, dto, user.sub);
    return {
      data,
      message: 'Expense logged',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'List venture expense entries' })
  async findAll(
    @Param('id') ventureId: string,
    @Query() filters: VentureExpenseFiltersDto,
  ) {
    const data = await this.expensesService.findAll(ventureId, filters);
    return { data, statusCode: HttpStatus.OK };
  }

  @Delete(':entryId')
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Soft-delete expense entry' })
  async delete(@Param('entryId') entryId: string) {
    const data = await this.expensesService.delete(entryId);
    return { data, statusCode: HttpStatus.OK };
  }
}
