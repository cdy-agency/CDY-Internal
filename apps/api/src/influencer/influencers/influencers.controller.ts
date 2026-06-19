import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { InfluencersService } from './influencers.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('influencer/database')
export class InfluencersController {
  constructor(private readonly influencersService: InfluencersService) {}

  @Get()
  @RequirePermission('influencer.database', 'read')
  async findAll(
    @Query('platform') platform?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.influencersService.findAll({ platform, category, search });
    return { data, message: 'OK', statusCode: 200 };
  }

  @Post()
  @RequirePermission('influencer.database', 'write')
  async create(
    @Body() dto: CreateInfluencerDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    const data = await this.influencersService.create(dto, req.user.sub);
    return { data, message: 'Influencer created', statusCode: 201 };
  }

  @Get(':id')
  @RequirePermission('influencer.database', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.influencersService.findOne(id);
    return { data, message: 'OK', statusCode: 200 };
  }

  @Patch(':id')
  @RequirePermission('influencer.database', 'write')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateInfluencerDto>) {
    const data = await this.influencersService.update(id, dto);
    return { data, message: 'Influencer updated', statusCode: 200 };
  }

  @Patch(':id/deactivate')
  @RequirePermission('influencer.database', 'write')
  async deactivate(@Param('id') id: string) {
    const data = await this.influencersService.deactivate(id);
    return { data, message: 'Influencer deactivated', statusCode: 200 };
  }
}
