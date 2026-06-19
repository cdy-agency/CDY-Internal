import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('influencer/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermission('influencer.campaigns', 'read')
  findAll() {
    return this.campaignsService.findAll();
  }

  @Post()
  @RequirePermission('influencer.campaigns', 'write')
  create(@Body() dto: CreateCampaignDto, @Req() req: Express.Request & { user: { sub: string } }) {
    return this.campaignsService.create(dto, req.user.sub);
  }

  @Get(':id')
  @RequirePermission('influencer.campaigns', 'read')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('influencer.campaigns', 'write')
  update(@Param('id') id: string, @Body() data: { status?: string; notes?: string }) {
    return this.campaignsService.update(id, data as Parameters<typeof this.campaignsService.update>[1]);
  }

  @Post(':id/complete')
  @RequirePermission('influencer.campaigns', 'write')
  complete(@Param('id') id: string, @Req() req: Express.Request & { user: { sub: string } }) {
    return this.campaignsService.complete(id, req.user.sub);
  }
}
