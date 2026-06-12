import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { format } from 'date-fns';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { UpdateClientDto } from './dto/update-client.dto';

function toActor(user: JwtPayload) {
  return { userId: user.sub, userEmail: user.email };
}

@ApiTags('crm-clients')
@ApiBearerAuth()
@Controller('crm/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermission('crm.clients', 'read')
  @ApiOperation({ summary: 'List clients' })
  async findAll(@Query('search') search?: string) {
    const data = await this.clientsService.findAll(search);
    return { data, message: 'Clients retrieved', statusCode: HttpStatus.OK };
  }

  @Get('export')
  @RequirePermission('crm.clients', 'read')
  @ApiOperation({ summary: 'Export clients to CSV' })
  async exportClients(
    @Query('search') search: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.clientsService.exportToCsv(search);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="CDY-Clients-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    });
    res.send(csv);
  }

  @Get('search')
  @RequirePermission('crm.clients', 'read')
  @ApiOperation({ summary: 'Search clients for autocomplete' })
  async search(@Query('q') query = '') {
    const data = await this.clientsService.search(query);
    return { data, message: 'Clients found', statusCode: HttpStatus.OK };
  }

  @Get(':id')
  @RequirePermission('crm.clients', 'read')
  @ApiOperation({ summary: 'Get client detail' })
  async findOne(@Param('id') id: string) {
    const data = await this.clientsService.findOne(id);
    return { data, message: 'Client retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('crm.clients', 'write')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.clientsService.update(id, dto, toActor(user));
    return { data, message: 'Client updated', statusCode: HttpStatus.OK };
  }
}
