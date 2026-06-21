import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  Req,
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
  async assign(
    @Param('id') campaignId: string,
    @Body() dto: AssignInfluencerDto,
  ) {
    const data = await this.assignmentsService.assign(campaignId, dto);
    return { data, message: 'Influencer assigned', statusCode: 201 };
  }

  @Delete('assignments/:assignmentId')
  @RequirePermission('influencer.campaigns', 'write')
  async remove(@Param('assignmentId') assignmentId: string) {
    const data = await this.assignmentsService.remove(assignmentId);
    return { data, message: 'Assignment removed', statusCode: 200 };
  }

  @Post('assignments/:assignmentId/pay')
  @RequirePermission('influencer.campaigns', 'write')
  async logPayment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: LogPaymentDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.assignmentsService.logPayment(assignmentId, dto, req.user.sub);
    return { data, message: 'Payment logged', statusCode: 200 };
  }
}
