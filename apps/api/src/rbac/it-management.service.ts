import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';

export interface ItAuditContext {
  userEmail: string;
  ipAddress: string | null;
}

@Injectable()
export class ItManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, permissions: true } },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { feature: true } },
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) throw new NotFoundException('Role not found');

    return role;
  }

  async createRole(dto: CreateRoleDto, itUserId: string, auditCtx: ItAuditContext) {
    const existing = await this.prisma.role.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException('A role with this key already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        key: dto.key,
        name: dto.name,
        description: dto.description,
        isDefault: false,
        isSystem: false,
      },
    });

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'role.created',
        targetType: 'Role',
        targetId: role.id,
        newValue: { key: role.key, name: role.name },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return role;
  }

  async updateRole(
    id: string,
    dto: UpdateRoleDto,
    itUserId: string,
    auditCtx: ItAuditContext,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const previous = { name: role.name, description: role.description };
    const updated = await this.prisma.role.update({
      where: { id },
      data: dto,
    });

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'role.updated',
        targetType: 'Role',
        targetId: id,
        previousValue: previous,
        newValue: { name: updated.name, description: updated.description },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return updated;
  }

  async deleteRole(id: string, itUserId: string, auditCtx: ItAuditContext) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        'Cannot delete a role that has users assigned',
      );
    }

    await this.prisma.role.delete({ where: { id } });

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'role.deleted',
        targetType: 'Role',
        targetId: id,
        previousValue: { key: role.key, name: role.name },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return { deleted: true };
  }

  async getRoleUsers(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.user.findMany({
      where: { roleId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async updateRolePermissions(
    roleId: string,
    dto: AssignPermissionDto,
    itUserId: string,
    auditCtx: ItAuditContext,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.key === 'CEO' || role.key === 'IT_ADMINISTRATOR') {
      throw new BadRequestException(
        'CEO and IT Administrator role permissions cannot be modified through the dashboard.',
      );
    }

    const previous = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { feature: true },
    });

    await this.prisma.$transaction(
      dto.permissions.map((p) =>
        this.prisma.rolePermission.upsert({
          where: {
            roleId_featureId: { roleId, featureId: p.featureId },
          },
          create: {
            roleId,
            featureId: p.featureId,
            canRead: p.canRead,
            canWrite: p.canWrite,
          },
          update: {
            canRead: p.canRead,
            canWrite: p.canWrite,
          },
        }),
      ),
    );

    await this.rbacService.invalidateRoleCache(roleId);

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'permission.bulk_updated',
        targetType: 'Role',
        targetId: roleId,
        previousValue: previous,
        newValue: dto.permissions as unknown as Prisma.InputJsonValue,
        ipAddress: auditCtx.ipAddress,
      },
    });

    return { updated: dto.permissions.length };
  }

  // Explicit field selection so security-sensitive columns (passwordHash) are
  // never serialized back to the IT dashboard.
  private static readonly SAFE_USER_SELECT = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    isActive: true,
    roleId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  async listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        ...ItManagementService.SAFE_USER_SELECT,
        role: { select: { id: true, key: true, name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...ItManagementService.SAFE_USER_SELECT,
        role: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const permissions = await this.rbacService.getUserPermissions(id);

    return {
      ...user,
      permissions,
    };
  }

  async createUser(dto: CreateUserDto, itUserId: string, auditCtx: ItAuditContext) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
      },
      include: { role: true },
    });

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'user.created',
        targetType: 'User',
        targetId: user.id,
        newValue: { email: user.email, roleKey: role.key },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async assignUserRole(
    userId: string,
    dto: AssignUserRoleDto,
    itUserId: string,
    auditCtx: ItAuditContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const targetRole = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!targetRole) throw new NotFoundException('Role not found');

    // Keep at least one active IT administrator: block moving the last one to
    // a non-IT role. (Role key is IT_ADMINISTRATOR since the IT→IT_ADMINISTRATOR
    // migration; the previous check used the obsolete 'IT' key and never fired.)
    if (
      user.role.key === 'IT_ADMINISTRATOR' &&
      targetRole.key !== 'IT_ADMINISTRATOR'
    ) {
      const remainingItAdmins = await this.prisma.user.count({
        where: {
          role: { key: 'IT_ADMINISTRATOR' },
          isActive: true,
          deletedAt: null,
          id: { not: userId },
        },
      });
      if (remainingItAdmins === 0) {
        throw new BadRequestException(
          'Cannot change the last IT administrator away from the IT role. Assign another IT administrator first.',
        );
      }
    }

    const previous = { roleId: user.roleId, roleName: user.role.name };

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: dto.roleId },
      include: { role: true },
    });

    await this.rbacService.invalidateUserCache(userId);

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'user.role_changed',
        targetType: 'User',
        targetId: userId,
        previousValue: previous,
        newValue: { roleId: dto.roleId, roleName: updated.role.name },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return updated;
  }

  async deactivateUser(userId: string, itUserId: string, auditCtx: ItAuditContext) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role.key === 'IT_ADMINISTRATOR') {
      const itCount = await this.prisma.user.count({
        where: {
          role: { key: 'IT_ADMINISTRATOR' },
          isActive: true,
          deletedAt: null,
          id: { not: userId },
        },
      });
      if (itCount === 0) {
        throw new BadRequestException('Cannot deactivate the last IT administrator');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.rbacService.invalidateUserCache(userId);

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'user.deactivated',
        targetType: 'User',
        targetId: userId,
        previousValue: { isActive: true },
        newValue: { isActive: false },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return updated;
  }

  async activateUser(userId: string, itUserId: string, auditCtx: ItAuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, deletedAt: null },
      include: { role: true },
    });

    await this.rbacService.invalidateUserCache(userId);

    await this.prisma.itAuditLog.create({
      data: {
        performedBy: itUserId,
        performedByEmail: auditCtx.userEmail,
        action: 'user.activated',
        targetType: 'User',
        targetId: userId,
        newValue: { isActive: true },
        ipAddress: auditCtx.ipAddress,
      },
    });

    return updated;
  }

  async listFeatures() {
    return this.prisma.systemFeature.findMany({
      where: { isActive: true },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async listAuditLogs(params: {
    action?: string;
    performedBy?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: {
      action?: string;
      performedBy?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (params.action) where.action = params.action;
    if (params.performedBy) where.performedBy = params.performedBy;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.itAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.itAuditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOverview() {
    const [totalUsers, activeUsers, totalRoles, recentActivity] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({
          where: { deletedAt: null, isActive: true },
        }),
        this.prisma.role.count(),
        this.prisma.itAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      totalUsers,
      activeUsers,
      totalRoles,
      pendingAccessRequests: 0,
      recentActivity,
    };
  }
}
