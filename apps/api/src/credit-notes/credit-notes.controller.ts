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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreditNotesService } from './credit-notes.service';
import {
  CreateCreditNoteDto,
  CreditNoteFiltersDto,
} from './dto/create-credit-note.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { Role } from '@cdy/shared';

@ApiTags('credit-notes')
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Post('invoices/:invoiceId/credit-notes')
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
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
