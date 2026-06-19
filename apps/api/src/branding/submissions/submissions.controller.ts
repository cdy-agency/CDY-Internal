import { Body, Controller, Param, Post, Request } from '@nestjs/common';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('branding')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Post('scope/:scopeItemId/submit')
  @RequirePermission('branding.delivery', 'write')
  submit(
    @Param('scopeItemId') scopeItemId: string,
    @Body() dto: CreateSubmissionDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.submit(scopeItemId, dto, req.user.sub);
  }

  @Post('submissions/:id/review')
  @RequirePermission('branding.delivery', 'write')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.review(id, dto, req.user.sub);
  }
}
