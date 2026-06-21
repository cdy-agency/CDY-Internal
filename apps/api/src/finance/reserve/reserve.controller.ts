import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReserveType } from '@prisma/client';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { ReserveService } from './reserve.service';

@ApiTags('finance/reserve')
@ApiBearerAuth()
@Controller('finance/reserve')
export class ReserveController {
  constructor(private readonly reserveService: ReserveService) {}

  @Get()
  @RequirePermission('finance.reserve', 'read')
  @ApiOperation({ summary: 'Get reserve account with recent transactions' })
  async getAccount() {
    const data = await this.reserveService.getAccount();
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('transactions')
  @RequirePermission('finance.reserve', 'read')
  @ApiOperation({ summary: 'Get reserve transaction history with filters' })
  async getTransactions(
    @Query('type') type?: ReserveType,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.reserveService.getTransactions({ type, from, to });
    return { data, statusCode: HttpStatus.OK };
  }

  @Get('summary')
  @RequirePermission('finance.reserve', 'read')
  @ApiOperation({ summary: 'Get reserve monthly summary' })
  async getSummary() {
    const data = await this.reserveService.getMonthlySummary();
    return { data, statusCode: HttpStatus.OK };
  }

  @Post('deposit')
  @RequirePermission('finance.reserve', 'write')
  @ApiOperation({ summary: 'Deposit into the reserve fund' })
  async deposit(
    @Body() dto: DepositDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.reserveService.deposit(dto, user.sub, user.email);
    return { data, message: 'Deposit recorded', statusCode: HttpStatus.CREATED };
  }

  @Post('withdraw')
  @RequirePermission('finance.reserve', 'write')
  @ApiOperation({ summary: 'Withdraw from the reserve fund' })
  async withdraw(
    @Body() dto: WithdrawDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.reserveService.withdraw(dto, user.sub, user.email);
    return { data, message: 'Withdrawal recorded', statusCode: HttpStatus.CREATED };
  }
}
