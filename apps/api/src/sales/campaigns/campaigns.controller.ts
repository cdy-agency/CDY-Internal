import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { SalesCampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { CreateSalesCampaignDto } from './dto/create-campaign.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('sales/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermission('sales.campaigns', 'read')
  async findAll() {
    const data = await this.campaignsService.findAll();
    return { data, message: 'OK', statusCode: 200 };
  }

  @Post()
  @RequirePermission('sales.campaigns', 'write')
  async create(
    @Body() dto: CreateSalesCampaignDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.campaignsService.create(dto, req.user.sub);
    return { data, message: 'Campaign created', statusCode: 201 };
  }

  @Get(':id')
  @RequirePermission('sales.campaigns', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.campaignsService.findOne(id);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Patch(':id')
  @RequirePermission('sales.campaigns', 'write')
  async update(
    @Param('id') id: string,
    @Body() data: { status?: SalesCampaignStatus; notes?: string },
  ) {
    const result = await this.campaignsService.update(id, data);
    return { data: result, message: 'Campaign updated', statusCode: 200 };
  }

  @Post(':id/complete')
  @RequirePermission('sales.campaigns', 'write')
  async complete(
    @Param('id') id: string,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.campaignsService.complete(id, req.user.sub);
    return { data, message: 'Campaign completed', statusCode: 200 };
  }

  @Get(':id/stats')
  @RequirePermission('sales.campaigns', 'read')
  async getStats(@Param('id') id: string) {
    const data = await this.campaignsService.getCampaignStats(id);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Delete(':id')
  @RequirePermission('sales.campaigns', 'write')
  @ApiOperation({ summary: 'Soft-delete sales campaign' })
  async remove(@Param('id') id: string) {
    const data = await this.campaignsService.remove(id);
    return { data, message: 'Campaign deleted', statusCode: 200 };
  }
}
