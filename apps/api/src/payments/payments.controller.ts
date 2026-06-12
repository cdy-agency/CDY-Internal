import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices/:invoiceId/payments')
  @RequirePermission('finance.payments', 'write')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  async recordPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.paymentsService.recordPayment(
      invoiceId,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Payment recorded',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('payments')
  @RequirePermission('finance.payments', 'read')
  @ApiOperation({ summary: 'List payments with filters' })
  async findAll(@Query() filters: PaymentFiltersDto) {
    const data = await this.paymentsService.findAll(filters);
    return {
      data,
      message: 'Payments retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('payments/:id')
  @RequirePermission('finance.payments', 'read')
  @ApiOperation({ summary: 'Get payment by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.paymentsService.findOne(id);
    return {
      data,
      message: 'Payment retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
