import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { SalesCampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { CreateSalesCampaignDto } from './dto/create-campaign.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermission('sales.campaigns', 'read')
  findAll() {
    return this.campaignsService.findAll();
  }

  @Post()
  @RequirePermission('sales.campaigns', 'write')
  create(
    @Body() dto: CreateSalesCampaignDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    return this.campaignsService.create(dto, req.user.sub);
  }

  @Get(':id')
  @RequirePermission('sales.campaigns', 'read')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('sales.campaigns', 'write')
  update(
    @Param('id') id: string,
    @Body() data: { status?: SalesCampaignStatus; notes?: string },
  ) {
    return this.campaignsService.update(id, data);
  }

  @Post(':id/complete')
  @RequirePermission('sales.campaigns', 'write')
  complete(
    @Param('id') id: string,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    return this.campaignsService.complete(id, req.user.sub);
  }

  @Get(':id/stats')
  @RequirePermission('sales.campaigns', 'read')
  getStats(@Param('id') id: string) {
    return this.campaignsService.getCampaignStats(id);
  }
}
