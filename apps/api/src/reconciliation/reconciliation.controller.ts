import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { ReconciliationService } from './reconciliation.service';
import { ResolveTransactionDto } from './dto/resolve-transaction.dto';
import { ReconciliationFiltersDto } from './dto/reconciliation-filters.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
@UseGuards(RolesGuard)
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('import')
  @Roles(Role.FINANCE_MANAGER)
  @UseInterceptors(
    FileInterceptor('statement', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import bank statement CSV' })
  async importStatement(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      return {
        data: null,
        message: 'No file uploaded',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    const data = await this.reconciliationService.importStatement(
      file,
      user.sub,
    );
    return {
      data,
      message: 'Statement imported',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get()
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'List reconciliation runs' })
  async findAll(@Query() filters: ReconciliationFiltersDto) {
    const data = await this.reconciliationService.findAll(filters);
    return {
      data,
      message: 'Reconciliation history retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Get reconciliation detail' })
  async findOne(@Param('id') id: string) {
    const data = await this.reconciliationService.findOne(id);
    return {
      data,
      message: 'Reconciliation retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id/transactions/:txId/resolve')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Resolve unmatched transaction' })
  async resolveTransaction(
    @Param('id') id: string,
    @Param('txId') txId: string,
    @Body() dto: ResolveTransactionDto,
    @CurrentUser() user: JwtPayload,
    @Req() _req: Request,
  ) {
    const data = await this.reconciliationService.resolveTransaction(
      id,
      txId,
      dto,
      user.sub,
    );
    return {
      data,
      message: 'Transaction resolved',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/complete')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Complete reconciliation' })
  async complete(@Param('id') id: string) {
    const data = await this.reconciliationService.completeReconciliation(id);
    return {
      data,
      message: 'Reconciliation completed',
      statusCode: HttpStatus.OK,
    };
  }
}
