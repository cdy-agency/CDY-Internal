import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreditNotesService } from './credit-notes.service';
import {
  CreateCreditNoteDto,
  CreditNoteFiltersDto,
} from './dto/create-credit-note.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';

@ApiTags('credit-notes')
@ApiBearerAuth()
@Controller()
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Post('invoices/:invoiceId/credit-notes')
  @RequirePermission('finance.credit_notes', 'write')
  @ApiOperation({ summary: 'Create credit note for invoice' })
  async create(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.creditNotesService.create(
      invoiceId,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: 'Credit note issued',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('invoices/:invoiceId/credit-notes')
  @RequirePermission('finance.credit_notes', 'read')
  @ApiOperation({ summary: 'Credit notes for an invoice' })
  async findByInvoice(@Param('invoiceId') invoiceId: string) {
    const data = await this.creditNotesService.findByInvoice(invoiceId);
    return {
      data,
      message: 'Credit notes retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('credit-notes')
  @RequirePermission('finance.credit_notes', 'read')
  @ApiOperation({ summary: 'List credit notes' })
  async findAll(@Query() filters: CreditNoteFiltersDto) {
    const data = await this.creditNotesService.findAll(filters);
    return {
      data,
      message: 'Credit notes retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('credit-notes/:id/pdf')
  @RequirePermission('finance.credit_notes', 'read')
  @ApiOperation({ summary: 'Download credit note PDF' })
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, number } = await this.creditNotesService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${number}.pdf"`,
    );
    res.send(buffer);
  }

  @Get('credit-notes/:id')
  @RequirePermission('finance.credit_notes', 'read')
  @ApiOperation({ summary: 'Get credit note by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.creditNotesService.findOne(id);
    return {
      data,
      message: 'Credit note retrieved',
      statusCode: HttpStatus.OK,
    };
  }
}
