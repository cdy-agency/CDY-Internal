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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { TaxService } from './tax.service';
import { TaxPdfService } from './tax-pdf.service';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { TaxPaymentDto } from './dto/tax-payment.dto';
import { TaxReportFiltersDto } from './dto/tax-report-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('tax')
@ApiBearerAuth()
@Controller('tax')
@UseGuards(RolesGuard)
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly taxPdfService: TaxPdfService,
  ) {}

  @Get('rates')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'List tax rates' })
  async findAllRates() {
    const data = await this.taxService.findAllRates();
    return { data, message: 'Tax rates retrieved', statusCode: HttpStatus.OK };
  }

  @Post('rates')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create tax rate' })
  async createRate(
    @Body() dto: CreateTaxRateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.taxService.createTaxRate(dto, user.sub);
    return { data, message: 'Tax rate created', statusCode: HttpStatus.CREATED };
  }

  @Delete('rates/:id')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Deactivate tax rate' })
  async deactivateRate(@Param('id') id: string) {
    const data = await this.taxService.deactivateTaxRate(id);
    return { data, message: 'Tax rate deactivated', statusCode: HttpStatus.OK };
  }

  @Get('report')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Tax liability report' })
  async getReport(@Query() filters: TaxReportFiltersDto) {
    const data = await this.taxService.getTaxLiabilityReport(filters);
    return { data, message: 'Tax report generated', statusCode: HttpStatus.OK };
  }

  @Get('report/pdf')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Record tax remittance' })
  async recordRemittance(
    @Body() dto: TaxPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.taxService.recordRemittance(dto, user.sub);
    return { data, message: 'Remittance recorded', statusCode: HttpStatus.CREATED };
  }

  @Get('remittances')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'List tax remittances' })
  async findRemittances() {
    const data = await this.taxService.findAllRemittances();
    return { data, message: 'Remittances retrieved', statusCode: HttpStatus.OK };
  }
}
