import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignInfluencerDto } from './dto/assign-influencer.dto';
import { LogPaymentDto } from './dto/log-payment.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('influencer')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('campaigns/:id/assign')
  @RequirePermission('influencer.campaigns', 'write')
  assign(
    @Param('id') campaignId: string,
    @Body() dto: AssignInfluencerDto,
  ) {
    return this.assignmentsService.assign(campaignId, dto);
  }

  @Delete('assignments/:assignmentId')
  @RequirePermission('influencer.campaigns', 'write')
  remove(@Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.remove(assignmentId);
  }

  @Post('assignments/:assignmentId/pay')
  @RequirePermission('influencer.campaigns', 'write')
  logPayment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: LogPaymentDto,
  ) {
    return this.assignmentsService.logPayment(assignmentId, dto);
  }
}
