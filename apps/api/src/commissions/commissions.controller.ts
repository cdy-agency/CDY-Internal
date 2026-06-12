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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { buildAuditContext } from '../common/audit/build-audit-context';
import { CommissionsService } from './commissions.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
} from './dto/create-commission-rule.dto';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';
import { ReviewCommissionDto } from './dto/review-commission.dto';
import {
  CommissionFiltersDto,
  PayrollMonthDto,
  ApproveAllDto,
} from './dto/commission-filters.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('commissions')
@ApiBearerAuth()
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('agents')
  @RequirePermission('finance.commissions', 'read')
  @ApiOperation({ summary: 'List sales agents for commission rules' })
  async findSalesAgents() {
    const data = await this.commissionsService.findSalesAgents();
    return { data, message: 'Agents retrieved', statusCode: HttpStatus.OK };
  }

  @Post('rules')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Create commission rule' })
  async createRule(
    @Body() dto: CreateCommissionRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.createRule(dto, user.sub);
    return { data, message: 'Rule created', statusCode: HttpStatus.CREATED };
  }

  @Get('rules')
  @RequirePermission('finance.commissions', 'read')
  @ApiOperation({ summary: 'List commission rules' })
  async findAllRules() {
    const data = await this.commissionsService.findAllRules();
    return { data, message: 'Rules retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('rules/:id')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Update commission rule' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateCommissionRuleDto) {
    const data = await this.commissionsService.updateRule(id, dto);
    return { data, message: 'Rule updated', statusCode: HttpStatus.OK };
  }

  @Delete('rules/:id')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Deactivate commission rule' })
  async deactivateRule(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.commissionsService.deactivateRule(
      id,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Rule deactivated', statusCode: HttpStatus.OK };
  }

  @Post('calculate')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Calculate commission for a closed deal' })
  async calculate(
    @Body() dto: CalculateCommissionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.commissionsService.calculate(
      dto,
      buildAuditContext(user, req),
    );
    return {
      data,
      message: data ? 'Commission calculated' : 'No applicable rule',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Get('my')
  @RequirePermission('finance.commissions.own', 'read')
  @ApiOperation({ summary: 'Get own commissions' })
  async findMyCommissions(
    @Query() filters: CommissionFiltersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.findMyCommissions(
      user.sub,
      filters,
    );
    return { data, message: 'Commissions retrieved', statusCode: HttpStatus.OK };
  }

  @Get('summary/me')
  @RequirePermission('finance.commissions.own', 'read')
  @ApiOperation({ summary: 'Agent commission summary' })
  async getMySummary(
    @Query('month') month: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.getMySummary(user.sub, month);
    return { data, message: 'Summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get('payroll')
  @RequirePermission('finance.commissions', 'read')
  @ApiOperation({ summary: 'Payroll summary for approved commissions' })
  async getPayrollSummary(@Query() query: PayrollMonthDto) {
    const data = await this.commissionsService.getPayrollSummary(query.month);
    return { data, message: 'Payroll summary', statusCode: HttpStatus.OK };
  }

  @Patch('approve-all')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Approve all pending commissions for a month' })
  async approveAll(
    @Query() query: ApproveAllDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.approveAll(
      query.month,
      user.sub,
    );
    return { data, message: 'Commissions approved', statusCode: HttpStatus.OK };
  }

  @Patch(':id/review')
  @RequirePermission('finance.commissions', 'write')
  @ApiOperation({ summary: 'Approve or reject a commission' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewCommissionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.commissionsService.review(
      id,
      dto,
      user.sub,
      buildAuditContext(user, req),
    );
    return { data, message: 'Commission reviewed', statusCode: HttpStatus.OK };
  }

  @Get()
  @RequirePermission('finance.commissions', 'read')
  @ApiOperation({ summary: 'List all commissions' })
  async findAll(@Query() filters: CommissionFiltersDto) {
    const data = await this.commissionsService.findAll(filters);
    return { data, message: 'Commissions retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('finance.commissions', 'read')
  @ApiOperation({ summary: 'Get commission by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.commissionsService.findOne(id);
    return { data, message: 'Commission retrieved', statusCode: HttpStatus.OK };
  }
}
