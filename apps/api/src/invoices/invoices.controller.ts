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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFiltersDto } from './dto/invoice-filters.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Create a new invoice' })
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.invoicesService.create(dto, user.sub);
    return {
      data,
      message: 'Invoice created',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @Roles(Role.FINANCE_MANAGER, Role.CEO, Role.PROJECT_MANAGER)
  @ApiOperation({ summary: 'List invoices with filters and pagination' })
  async findAll(@Query() filters: InvoiceFiltersDto) {
    const data = await this.invoicesService.findAll(filters);
    return {
      data,
      message: 'Invoices retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id/pdf')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer, invoiceNumber } = await this.invoicesService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoiceNumber}.pdf"`,
    );
    res.send(buffer);
  }

  @Get(':id')
  @Roles(Role.FINANCE_MANAGER, Role.CEO, Role.PROJECT_MANAGER)
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.invoicesService.findOne(id);
    return {
      data,
      message: 'Invoice retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Update a draft invoice' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    const data = await this.invoicesService.update(id, dto);
    return {
      data,
      message: 'Invoice updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/send-reminder')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Send manual payment reminder' })
  async sendReminder(@Param('id') id: string) {
    const data = await this.invoicesService.sendManualReminder(id);
    return {
      data,
      message: 'Reminder sent to client',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/send')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Send invoice via email' })
  async send(
    @Param('id') id: string,
    @Body() dto: SendInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.invoicesService.send(id, user.sub, dto);
    return {
      data,
      message: 'Invoice sent',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Soft-delete an invoice' })
  async remove(@Param('id') id: string) {
    const data = await this.invoicesService.softDelete(id);
    return {
      data,
      message: data.message,
      statusCode: HttpStatus.OK,
    };
  }
}
