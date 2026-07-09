import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { DeliverablesService } from './deliverables.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('influencer')
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post('assignments/:assignmentId/deliverables')
  @RequirePermission('influencer.campaigns', 'write')
  async add(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    const data = await this.deliverablesService.add(assignmentId, dto);
    return { data, message: 'Deliverable added', statusCode: 201 };
  }

  @Patch('deliverables/:id/submit')
  @RequirePermission('influencer.campaigns', 'write')
  async markSubmitted(
    @Param('id') id: string,
    @Body() body: { postUrl?: string },
  ) {
    const data = await this.deliverablesService.markSubmitted(id, body.postUrl);
    return { data, message: 'Deliverable submitted', statusCode: 200 };
  }

  @Patch('deliverables/:id/verify')
  @RequirePermission('influencer.campaigns', 'write')
  async verify(
    @Param('id') id: string,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.deliverablesService.verify(id, req.user.sub);
    return { data, message: 'Deliverable verified', statusCode: 200 };
  }

  @Patch('deliverables/:id/missed')
  @RequirePermission('influencer.campaigns', 'write')
  async markMissed(@Param('id') id: string) {
    const data = await this.deliverablesService.markMissed(id);
    return { data, message: 'Deliverable marked missed', statusCode: 200 };
  }

  @Delete('deliverables/:id')
  @RequirePermission('influencer.campaigns', 'write')
  @ApiOperation({ summary: 'Soft-delete deliverable' })
  async remove(@Param('id') id: string) {
    const data = await this.deliverablesService.remove(id);
    return { data, message: 'Deliverable deleted', statusCode: 200 };
  }
}
