import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseFiltersDto } from './dto/expense-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(Role.FINANCE_MANAGER)
  @UseInterceptors(
    FileInterceptor('receipt', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create an expense with optional receipt upload' })
  async create(
    @Body() dto: CreateExpenseDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.expensesService.create(
      dto,
      user.sub,
      buildAuditContext(user, req),
      file,
    );
    return {
      data,
      message: 'Expense created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @Roles(Role.FINANCE_MANAGER, Role.CEO, Role.PROJECT_MANAGER)
  @ApiOperation({ summary: 'List expenses with filters' })
  async findAll(@Query() filters: ExpenseFiltersDto) {
    const data = await this.expensesService.findAll(filters);
    return {
      data,
      message: 'Expenses retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Get expense by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.expensesService.findOne(id);
    return {
      data,
      message: 'Expense retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Update expense (24hr window)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.expensesService.update(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Expense updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Soft-delete expense' })
  async remove(@Param('id') id: string) {
    const data = await this.expensesService.softDelete(id);
    return {
      data,
      message: data.message,
      statusCode: HttpStatus.OK,
    };
  }
}
