import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ItManagementService } from './it-management.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';

function buildItAuditContext(user: JwtPayload, req: Request) {
  return {
    userEmail: user.email,
    ipAddress: req.ip ?? null,
  };
}

@ApiTags('it-users')
@ApiBearerAuth()
@Controller('it/users')
export class UsersController {
  constructor(private readonly itService: ItManagementService) {}

  @Get()
  @RequirePermission('it.users', 'read')
  @ApiOperation({ summary: 'List all users' })
  async list() {
    const data = await this.itService.listUsers();
    return { data, message: 'Users retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('it.users', 'write')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.createUser(
      dto,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'User created', statusCode: HttpStatus.CREATED };
  }

  @Get(':id')
  @RequirePermission('it.users', 'read')
  @ApiOperation({ summary: 'Get user detail' })
  async getOne(@Param('id') id: string) {
    const data = await this.itService.getUser(id);
    return { data, message: 'User retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id/role')
  @RequirePermission('it.users', 'write')
  @ApiOperation({ summary: 'Assign user to a role' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignUserRoleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.assignUserRole(
      id,
      dto,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'Role assigned', statusCode: HttpStatus.OK };
  }

  @Patch(':id/activate')
  @RequirePermission('it.users', 'write')
  @ApiOperation({ summary: 'Reactivate a deactivated user' })
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.activateUser(
      id,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'User activated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('it.users', 'write')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.deactivateUser(
      id,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'User deactivated', statusCode: HttpStatus.OK };
  }
}
