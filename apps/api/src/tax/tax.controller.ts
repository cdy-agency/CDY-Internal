import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { TaxService } from './tax.service';
import { TaxPdfService } from './tax-pdf.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { TaxPaymentDto } from './dto/tax-payment.dto';
import { TaxReportFiltersDto } from './dto/tax-report-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('tax')
@ApiBearerAuth()
@Controller('tax')
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly taxPdfService: TaxPdfService,
  ) {}

  @Get('rates')
  @RequirePermission('finance.tax', 'read')
  @ApiOperation({ summary: 'List tax rates' })
  async findAllRates() {
    const data = await this.taxService.findAllRates();
    return { data, message: 'Tax rates retrieved', statusCode: HttpStatus.OK };
  }

  @Post('rates')
  @RequirePermission('finance.tax', 'write')
  @ApiOperation({ summary: 'Create tax rate' })
  async createRate(
    @Body() dto: CreateTaxRateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.taxService.createTaxRate(dto, user.sub);
    return { data, message: 'Tax rate created', statusCode: HttpStatus.CREATED };
  }

  @Delete('rates/:id')
  @RequirePermission('finance.tax', 'write')
  @ApiOperation({ summary: 'Deactivate tax rate' })
  async deactivateRate(@Param('id') id: string) {
    const data = await this.taxService.deactivateTaxRate(id);
    return { data, message: 'Tax rate deactivated', statusCode: HttpStatus.OK };
  }

  @Get('report')
  @RequirePermission('finance.tax', 'read')
  @ApiOperation({ summary: 'Tax liability report' })
  async getReport(@Query() filters: TaxReportFiltersDto) {
    const data = await this.taxService.getTaxLiabilityReport(filters);
    return { data, message: 'Tax report generated', statusCode: HttpStatus.OK };
  }

  @Get('report/pdf')
  @RequirePermission('finance.tax', 'read')
  @ApiOperation({ summary: 'Download tax liability report PDF' })
  async downloadReportPdf(
    @Query() filters: TaxReportFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.taxService.getTaxLiabilityReport(filters);
    const buffer = await this.taxPdfService.generate(data);
    const dateLabel = format(new Date(), 'MMM-yyyy');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDY-Tax-Report-${dateLabel}.pdf"`,
    );
    res.send(buffer);
  }

  @Post('remittances')
  @RequirePermission('finance.tax', 'write')
  @ApiOperation({ summary: 'Record tax remittance' })
  async recordRemittance(
    @Body() dto: TaxPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.taxService.recordRemittance(dto, user.sub);
    return { data, message: 'Remittance recorded', statusCode: HttpStatus.CREATED };
  }

  @Get('remittances')
  @RequirePermission('finance.tax', 'read')
  @ApiOperation({ summary: 'List tax remittances' })
  async findRemittances() {
    const data = await this.taxService.findAllRemittances();
    return { data, message: 'Remittances retrieved', statusCode: HttpStatus.OK };
  }

  @Delete('remittances/:id')
  @RequirePermission('finance.tax', 'write')
  @ApiOperation({ summary: 'Soft-delete tax remittance' })
  async removeRemittance(@Param('id') id: string) {
    const data = await this.taxService.removeRemittance(id);
    return { data, message: data.message, statusCode: HttpStatus.OK };
  }
}
