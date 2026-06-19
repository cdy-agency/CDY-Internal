import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { DeliverablesService } from './deliverables.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('influencer')
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post('assignments/:assignmentId/deliverables')
  @RequirePermission('influencer.campaigns', 'write')
  add(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.deliverablesService.add(assignmentId, dto);
  }

  @Patch('deliverables/:id/submit')
  @RequirePermission('influencer.campaigns', 'write')
  markSubmitted(
    @Param('id') id: string,
    @Body() body: { postUrl?: string },
  ) {
    return this.deliverablesService.markSubmitted(id, body.postUrl);
  }

  @Patch('deliverables/:id/verify')
  @RequirePermission('influencer.campaigns', 'write')
  verify(
    @Param('id') id: string,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    return this.deliverablesService.verify(id, req.user.sub);
  }

  @Patch('deliverables/:id/missed')
  @RequirePermission('influencer.campaigns', 'write')
  markMissed(@Param('id') id: string) {
    return this.deliverablesService.markMissed(id);
  }
}
