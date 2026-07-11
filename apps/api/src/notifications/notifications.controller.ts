import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationFiltersDto } from './dto/notification-filters.dto';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @AllowAuthenticated()
  @ApiOperation({ summary: 'List notifications for current user' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() filters: NotificationFiltersDto,
  ) {
    const data = await this.notificationsService.findAll(user.sub, filters);
    return {
      data,
      message: 'Notifications retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('unread-count')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Unread notification count' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return {
      data: { count },
      message: 'Unread count retrieved',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch('read-all')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    const data = await this.notificationsService.markAllRead(user.sub);
    return {
      data,
      message: 'All notifications marked read',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id/read')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.notificationsService.markRead(id, user.sub);
    return {
      data,
      message: 'Notification marked read',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @AllowAuthenticated()
  @ApiOperation({ summary: 'Soft-delete notification' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.notificationsService.remove(id, user.sub);
    return {
      data,
      message: data.message,
      statusCode: HttpStatus.OK,
    };
  }
}
