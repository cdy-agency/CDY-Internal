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
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('commissions')
@ApiBearerAuth()
@Controller('commissions')
@UseGuards(RolesGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post('rules')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Create commission rule' })
  async createRule(
    @Body() dto: CreateCommissionRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.createRule(dto, user.sub);
    return { data, message: 'Rule created', statusCode: HttpStatus.CREATED };
  }

  @Get('rules')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'List commission rules' })
  async findAllRules() {
    const data = await this.commissionsService.findAllRules();
    return { data, message: 'Rules retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('rules/:id')
  @Roles(Role.CEO, Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Update commission rule' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateCommissionRuleDto) {
    const data = await this.commissionsService.updateRule(id, dto);
    return { data, message: 'Rule updated', statusCode: HttpStatus.OK };
  }

  @Post('calculate')
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.SALES_AGENT)
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
  @Roles(Role.SALES_AGENT)
  @ApiOperation({ summary: 'Agent commission summary' })
  async getMySummary(
    @Query('month') month: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.commissionsService.getMySummary(user.sub, month);
    return { data, message: 'Summary retrieved', statusCode: HttpStatus.OK };
  }

  @Get('payroll')
  @Roles(Role.FINANCE_MANAGER)
  @ApiOperation({ summary: 'Payroll summary for approved commissions' })
  async getPayrollSummary(@Query() query: PayrollMonthDto) {
    const data = await this.commissionsService.getPayrollSummary(query.month);
    return { data, message: 'Payroll summary', statusCode: HttpStatus.OK };
  }

  @Patch('approve-all')
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER)
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
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'List all commissions' })
  async findAll(@Query() filters: CommissionFiltersDto) {
    const data = await this.commissionsService.findAll(filters);
    return { data, message: 'Commissions retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @Roles(Role.FINANCE_MANAGER, Role.CEO)
  @ApiOperation({ summary: 'Get commission by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.commissionsService.findOne(id);
    return { data, message: 'Commission retrieved', statusCode: HttpStatus.OK };
  }
}
