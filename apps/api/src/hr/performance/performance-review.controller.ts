import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { buildAuditContext } from '../../common/audit/build-audit-context';
import { EmployeesService } from '../employees/employees.service';
import { PerformanceReviewService } from './performance-review.service';
import {
  CompleteReviewDto,
  CreatePerformanceReviewDto,
  SelfAssessmentDto,
} from './dto/performance-review.dto';

@ApiTags('hr-performance')
@ApiBearerAuth()
@Controller('hr/performance')
export class PerformanceReviewController {
  constructor(
    private readonly performanceReviewService: PerformanceReviewService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Post()
  @RequirePermission('hr.performance', 'write')
  @ApiOperation({ summary: 'Create performance review' })
  async create(
    @Body() dto: CreatePerformanceReviewDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.performanceReviewService.create(
      dto,
      buildAuditContext(user, req),
    );
    return { data, message: 'Review created', statusCode: HttpStatus.CREATED };
  }

  @Get()
  @RequirePermission('hr.performance', 'read')
  @ApiOperation({ summary: 'List performance reviews' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('period') period?: string,
  ) {
    const data = await this.performanceReviewService.findAll({
      employeeId,
      period,
    });
    return { data, message: 'Reviews retrieved', statusCode: HttpStatus.OK };
  }

  @Get('pending')
  @RequirePermission('hr.performance', 'read')
  @ApiOperation({ summary: 'Pending reviews for manager' })
  async getPending(@CurrentUser() user: JwtPayload) {
    const employee = await this.employeesService.findEmployeeIdByUserId(
      user.sub,
    );
    const data = employee
      ? await this.performanceReviewService.getPendingReviews(employee)
      : [];
    return { data, message: 'Pending reviews retrieved', statusCode: HttpStatus.OK };
  }

  @Get('my')
  @ApiOperation({ summary: 'My performance reviews' })
  async getMy(@CurrentUser() user: JwtPayload) {
    const data = await this.performanceReviewService.getMyReviews(user.sub);
    return { data, message: 'My reviews retrieved', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get performance review by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const canReadAll = Boolean(user.permissions?.['hr.performance']?.canRead);
    const data = await this.performanceReviewService.findOneAccessible(
      id,
      user.sub,
      canReadAll,
    );
    return { data, message: 'Review retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id/self-assessment')
  @ApiOperation({ summary: 'Submit self-assessment' })
  async submitSelfAssessment(
    @Param('id') id: string,
    @Body() dto: SelfAssessmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const employeeId = await this.employeesService.requireEmployeeIdByUserId(
      user.sub,
    );
    const data = await this.performanceReviewService.submitSelfAssessment(
      id,
      dto,
      employeeId,
    );
    return {
      data,
      message: 'Self-assessment submitted',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id/complete')
  @RequirePermission('hr.performance', 'write')
  @ApiOperation({ summary: 'Complete manager review' })
  async completeReview(
    @Param('id') id: string,
    @Body() dto: CompleteReviewDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.performanceReviewService.completeReview(
      id,
      dto,
      buildAuditContext(user, req),
    );
    return { data, message: 'Review completed', statusCode: HttpStatus.OK };
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge completed review' })
  async acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const employeeId = await this.employeesService.requireEmployeeIdByUserId(
      user.sub,
    );
    const data = await this.performanceReviewService.acknowledge(
      id,
      employeeId,
    );
    return { data, message: 'Review acknowledged', statusCode: HttpStatus.OK };
  }
}
