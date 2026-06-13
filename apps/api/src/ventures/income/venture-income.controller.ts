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
import { VentureIncomeService } from './venture-income.service';
import { CreateVentureIncomeDto } from './dto/create-venture-income.dto';
import { VentureIncomeFiltersDto } from './dto/venture-income-filters.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('ventures')
@ApiBearerAuth()
@Controller('ventures/:id/income')
export class VentureIncomeController {
  constructor(private readonly incomeService: VentureIncomeService) {}

  @Post()
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Log venture income' })
  async create(
    @Param('id') ventureId: string,
    @Body() dto: CreateVentureIncomeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.incomeService.create(ventureId, dto, user.sub);
    return {
      data,
      message: 'Income logged',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @RequirePermission('ventures.view', 'read')
  @ApiOperation({ summary: 'List venture income entries' })
  async findAll(
    @Param('id') ventureId: string,
    @Query() filters: VentureIncomeFiltersDto,
  ) {
    const data = await this.incomeService.findAll(ventureId, filters);
    return { data, statusCode: HttpStatus.OK };
  }

  @Delete(':entryId')
  @RequirePermission('ventures.manage', 'write')
  @ApiOperation({ summary: 'Soft-delete income entry' })
  async delete(@Param('entryId') entryId: string) {
    const data = await this.incomeService.delete(entryId);
    return { data, statusCode: HttpStatus.OK };
  }
}
