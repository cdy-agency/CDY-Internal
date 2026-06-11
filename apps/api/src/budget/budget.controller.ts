import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { BudgetService } from './budget.service';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { BudgetIncreaseRequestDto } from './dto/budget-increase-request.dto';
import { ReviewBudgetRequestDto } from './dto/review-budget-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Role } from '@cdy/shared';

@ApiTags('budget')
@ApiBearerAuth()
@Controller('budget')
@UseGuards(RolesGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @Roles(Role.FINANCE_MANAGER, Role.OPERATIONS_MANAGER)
  @ApiOperation({ summary: 'Create project budget' })
  async create(
    @Body() dto: CreateProjectBudgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.budgetService.createBudget(dto, user.sub);
    return { data, message: 'Budget created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @Roles(Role.CEO, Role.FINANCE_MANAGER, Role.OPERATIONS_MANAGER)
  @ApiOperation({ summary: 'List all project budgets with status' })
  async findAll() {
    const data = await this.budgetService.findAll();
    return { data, message: 'Budgets retrieved', statusCode: HttpStatus.OK };
  }

  @Get('increase-requests')
  @Roles(Role.CEO, Role.FINANCE_MANAGER, Role.OPERATIONS_MANAGER)
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
  @Roles(
    Role.CEO,
    Role.FINANCE_MANAGER,
    Role.OPERATIONS_MANAGER,
    Role.PROJECT_MANAGER,
  )
  @ApiOperation({ summary: 'Get budget status for project' })
  async getStatus(@Param('projectId') projectId: string) {
    const data = await this.budgetService.getBudgetStatus(projectId);
    return { data, message: 'Budget status retrieved', statusCode: HttpStatus.OK };
  }

  @Post(':projectId/increase-request')
  @Roles(Role.PROJECT_MANAGER, Role.FINANCE_MANAGER)
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
  @Roles(Role.OPERATIONS_MANAGER)
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
