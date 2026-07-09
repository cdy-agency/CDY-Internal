import { Body, Controller, Delete, Param, Post, Request } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

@Controller('branding')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Post('scope/:scopeItemId/submit')
  @RequirePermission('branding.delivery', 'write')
  async submit(
    @Param('scopeItemId') scopeItemId: string,
    @Body() dto: CreateSubmissionDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.service.submit(scopeItemId, dto, req.user.sub);
    return { data, message: 'Submission created', statusCode: 201 };
  }

  @Post('submissions/:id/review')
  @RequirePermission('branding.delivery', 'write')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
    @Request() req: { user: { sub: string } },
  ) {
    const data = await this.service.review(id, dto, req.user.sub);
    return { data, message: 'Submission reviewed', statusCode: 200 };
  }

  @Delete('submissions/:id')
  @RequirePermission('branding.delivery', 'write')
  @ApiOperation({ summary: 'Soft-delete design submission' })
  async remove(@Param('id') id: string) {
    const data = await this.service.remove(id);
    return { data, message: data.message, statusCode: 200 };
  }
}
