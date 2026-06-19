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
  async findAll() {
    const data = await this.campaignsService.findAll();
    return { data, message: 'OK', statusCode: 200 };
  }

  @Post()
  @RequirePermission('influencer.campaigns', 'write')
  async create(@Body() dto: CreateCampaignDto, @Req() req: Express.Request & { user: { sub: string } }) {
    const data = await this.campaignsService.create(dto, req.user.sub);
    return { data, message: 'Campaign created', statusCode: 201 };
  }

  @Get(':id')
  @RequirePermission('influencer.campaigns', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.campaignsService.findOne(id);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Patch(':id')
  @RequirePermission('influencer.campaigns', 'write')
  async update(@Param('id') id: string, @Body() body: { status?: string; notes?: string }) {
    const data = await this.campaignsService.update(id, body as Parameters<typeof this.campaignsService.update>[1]);
    return { data, message: 'Campaign updated', statusCode: 200 };
  }

  @Post(':id/complete')
  @RequirePermission('influencer.campaigns', 'write')
  async complete(@Param('id') id: string, @Req() req: Express.Request & { user: { sub: string } }) {
    const data = await this.campaignsService.complete(id, req.user.sub);
    return { data, message: 'Campaign completed', statusCode: 200 };
  }
}
