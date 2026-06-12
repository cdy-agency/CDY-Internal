import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BudgetService } from './budget.service';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { BudgetIncreaseRequestDto } from './dto/budget-increase-request.dto';
import { ReviewBudgetRequestDto } from './dto/review-budget-request.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('budget')
@ApiBearerAuth()
@Controller('budget')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @RequirePermission('finance.budget', 'write')
  @ApiOperation({ summary: 'Create project budget' })
  async create(
    @Body() dto: CreateProjectBudgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.budgetService.createBudget(dto, user.sub);
    return { data, message: 'Budget created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('finance.budget', 'read')
  @ApiOperation({ summary: 'List all project budgets with status' })
  async findAll() {
    const data = await this.budgetService.findAll();
    return { data, message: 'Budgets retrieved', statusCode: HttpStatus.OK };
  }

  @Get('increase-requests')
  @RequirePermission('finance.budget', 'read')
  @ApiOperation({ summary: 'List pending budget increase requests' })
  async findPendingRequests() {
    const data = await this.budgetService.findPendingIncreaseRequests();
    return {
      data,
      message: 'Pending requests retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':projectId')
  @RequirePermission('finance.budget', 'read')
  @ApiOperation({ summary: 'Get budget status for project' })
  async getStatus(@Param('projectId') projectId: string) {
    const data = await this.budgetService.getBudgetStatus(projectId);
    return { data, message: 'Budget status retrieved', statusCode: HttpStatus.OK };
  }

  @Post(':projectId/increase-request')
  @RequirePermission('finance.budget', 'write')
  @ApiOperation({ summary: 'Request budget increase' })
  async requestIncrease(
    @Param('projectId') projectId: string,
    @Body() dto: BudgetIncreaseRequestDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.budgetService.requestBudgetIncrease(
      projectId,
      dto,
      user.sub,
      dto.requesterName ?? user.email,
    );
    return {
      data,
      message: 'Budget increase requested',
      statusCode: HttpStatus.CREATED,
    };
  }

  @Patch('increase-requests/:id/review')
  @RequirePermission('finance.budget', 'write')
  @ApiOperation({ summary: 'Review budget increase request' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewBudgetRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.budgetService.reviewBudgetRequest(
      id,
      dto,
      user.sub,
    );
    return { data, message: 'Request reviewed', statusCode: HttpStatus.OK };
  }
}
