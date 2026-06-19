import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingClientsService } from './marketing-clients.service';
import {
  CreateMarketingClientDto,
  UpdateMarketingClientDto,
} from './dto/create-marketing-client.dto';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../../auth/decorators/current-user.decorator';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing/clients')
export class MarketingClientsController {
  constructor(
    private readonly marketingClientsService: MarketingClientsService,
  ) {}

  @Get()
  @RequirePermission('marketing.clients', 'read')
  async findAll() {
    const data = await this.marketingClientsService.findAll();
    return { data, statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('marketing.clients', 'write')
  async create(
    @Body() dto: CreateMarketingClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.marketingClientsService.create(dto, user.sub);
    return { data, message: 'Marketing client created', statusCode: HttpStatus.CREATED };
  }

  @Get(':id')
  @RequirePermission('marketing.clients', 'read')
  async findOne(@Param('id') id: string) {
    const data = await this.marketingClientsService.findOne(id);
    return { data, statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('marketing.clients', 'write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMarketingClientDto,
  ) {
    const data = await this.marketingClientsService.update(id, dto);
    return { data, message: 'Marketing client updated', statusCode: HttpStatus.OK };
  }
}
