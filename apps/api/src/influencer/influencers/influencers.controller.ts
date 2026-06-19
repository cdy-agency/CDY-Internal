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
  findAll(
    @Query('platform') platform?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.influencersService.findAll({ platform, category, search });
  }

  @Post()
  @RequirePermission('influencer.database', 'write')
  create(
    @Body() dto: CreateInfluencerDto,
    @Req() req: Express.Request & { user: { sub: string } },
  ) {
    return this.influencersService.create(dto, req.user.sub);
  }

  @Get(':id')
  @RequirePermission('influencer.database', 'read')
  findOne(@Param('id') id: string) {
    return this.influencersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('influencer.database', 'write')
  update(@Param('id') id: string, @Body() dto: Partial<CreateInfluencerDto>) {
    return this.influencersService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermission('influencer.database', 'write')
  deactivate(@Param('id') id: string) {
    return this.influencersService.deactivate(id);
  }
}
