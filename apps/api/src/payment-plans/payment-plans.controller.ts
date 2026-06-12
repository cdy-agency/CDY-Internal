import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentPlansService } from './payment-plans.service';
import {
  CreatePaymentPlanDto,
  PayInstalmentDto,
} from './dto/create-payment-plan.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';

@ApiTags('payment-plans')
@ApiBearerAuth()
@Controller()
export class PaymentPlansController {
  constructor(private readonly paymentPlansService: PaymentPlansService) {}

  @Post('invoices/:invoiceId/payment-plan')
  @RequirePermission('finance.payment_plans', 'write')
  @ApiOperation({ summary: 'Create payment plan for invoice' })
  async create(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreatePaymentPlanDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.paymentPlansService.create(
      invoiceId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Payment plan created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('invoices/:invoiceId/payment-plan')
  @RequirePermission('finance.payment_plans', 'read')
  @ApiOperation({ summary: 'Get payment plan for invoice' })
  async findByInvoice(@Param('invoiceId') invoiceId: string) {
    const data = await this.paymentPlansService.findByInvoice(invoiceId);
    return {
      data,
      message: data ? 'Payment plan retrieved' : 'No payment plan',
      statusCode: HttpStatus.OK,
    };
  }

  @Post('payment-plans/:id/instalments/:itemId/pay')
  @RequirePermission('finance.payment_plans', 'write')
  @ApiOperation({ summary: 'Pay a payment plan instalment' })
  async payInstalment(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: PayInstalmentDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.paymentPlansService.payInstalment(
      id,
      itemId,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Instalment paid',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete('payment-plans/:id')
  @RequirePermission('finance.payment_plans', 'write')
  @ApiOperation({ summary: 'Cancel payment plan' })
  async cancel(@Param('id') id: string) {
    const data = await this.paymentPlansService.cancel(id);
    return {
      data,
      message: 'Payment plan cancelled',
      statusCode: HttpStatus.OK,
    };
  }
}
