import { Controller, Get, Post, Delete, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompanyAccountsService } from './company-accounts.service';
import { CreateCompanyAccountDto } from './dto/create-company-account.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('company-accounts')
@ApiBearerAuth()
@Controller('company-accounts')
export class CompanyAccountsController {
  constructor(private readonly companyAccountsService: CompanyAccountsService) {}

  @Get()
  @RequirePermission('finance.accounts', 'read')
  @ApiOperation({ summary: 'List company bank/mobile money accounts' })
  async findAll() {
    const data = await this.companyAccountsService.findAll();
    return { data, message: 'Company accounts retrieved', statusCode: HttpStatus.OK };
  }

  @Get('lookup')
  @RequirePermission('finance.accounts.lookup', 'read')
  @ApiOperation({ summary: 'Lookup active company accounts for pickers' })
  async lookup() {
    const data = await this.companyAccountsService.lookup();
    return { data, message: 'Company accounts found', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('finance.accounts', 'write')
  @ApiOperation({ summary: 'Create company account' })
  async create(
    @Body() dto: CreateCompanyAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.companyAccountsService.create(dto, user.sub);
    return { data, message: 'Company account created', statusCode: HttpStatus.CREATED };
  }

  @Delete(':id')
  @RequirePermission('finance.accounts', 'write')
  @ApiOperation({ summary: 'Deactivate company account' })
  async deactivate(@Param('id') id: string) {
    const data = await this.companyAccountsService.deactivate(id);
    return { data, message: 'Company account deactivated', statusCode: HttpStatus.OK };
  }
}
