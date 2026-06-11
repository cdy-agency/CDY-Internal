import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoices/:invoiceId/payments')
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
