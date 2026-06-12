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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';

function buildItAuditContext(user: JwtPayload, req: Request) {
  return {
    userEmail: user.email,
    ipAddress: req.ip ?? null,
  };
}

@ApiTags('it-roles')
@ApiBearerAuth()
@Controller('it/roles')
export class RolesController {
  constructor(private readonly itService: ItManagementService) {}

  @Get()
  @RequirePermission('it.roles', 'read')
  @ApiOperation({ summary: 'List all roles' })
  async list() {
    const data = await this.itService.listRoles();
    return { data, message: 'Roles retrieved', statusCode: HttpStatus.OK };
  }

  @Post()
  @RequirePermission('it.roles', 'write')
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.createRole(
      dto,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'Role created', statusCode: HttpStatus.CREATED };
  }

  @Get(':id')
  @RequirePermission('it.roles', 'read')
  @ApiOperation({ summary: 'Get role detail with permission matrix' })
  async getOne(@Param('id') id: string) {
    const data = await this.itService.getRole(id);
    return { data, message: 'Role retrieved', statusCode: HttpStatus.OK };
  }

  @Patch(':id')
  @RequirePermission('it.roles', 'write')
  @ApiOperation({ summary: 'Update role name and description' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.updateRole(
      id,
      dto,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'Role updated', statusCode: HttpStatus.OK };
  }

  @Delete(':id')
  @RequirePermission('it.roles', 'write')
  @ApiOperation({ summary: 'Delete a role' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.deleteRole(
      id,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'Role deleted', statusCode: HttpStatus.OK };
  }

  @Get(':id/users')
  @RequirePermission('it.roles', 'read')
  @ApiOperation({ summary: 'List users assigned to role' })
  async getUsers(@Param('id') id: string) {
    const data = await this.itService.getRoleUsers(id);
    return { data, message: 'Users retrieved', statusCode: HttpStatus.OK };
  }

  @Post(':id/permissions')
  @RequirePermission('it.permissions', 'write')
  @ApiOperation({ summary: 'Bulk update role permissions' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const data = await this.itService.updateRolePermissions(
      id,
      dto,
      user.sub,
      buildItAuditContext(user, req),
    );
    return { data, message: 'Permissions updated', statusCode: HttpStatus.OK };
  }
}
