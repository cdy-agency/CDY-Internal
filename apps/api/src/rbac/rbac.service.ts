import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import type { PermissionMap, PermissionProfile } from './permission.types';

export type { PermissionMap, PermissionProfile } from './permission.types';

@Injectable()
export class RbacService {
  private static readonly CACHE_TTL_SECONDS = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async can(
    userId: string,
    featureKey: string,
    action: 'read' | 'write',
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const permission = permissions[featureKey];
    if (!permission) return false;
    return action === 'read' ? permission.canRead : permission.canWrite;
  }

  async getUserPermissions(userId: string): Promise<PermissionMap> {
    const cacheKey = `rbac:user:${userId}`;
    const cached = await this.cache.get<PermissionMap>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { feature: true },
              where: { feature: { isActive: true } },
            },
          },
        },
      },
    });

    if (!user) return {};

    // No role is special-cased here: every role (including CEO) resolves to
    // exactly the feature permissions stored on it. The CEO role is granted
    // all features by the seed, which runs on every boot, and its permission
    // matrix cannot be edited from the IT dashboard.
    const permissionMap: PermissionMap = Object.fromEntries(
      user.role.permissions.map((p) => [
        p.feature.key,
        { canRead: p.canRead, canWrite: p.canWrite },
      ]),
    );

    await this.cache.set(
      cacheKey,
      permissionMap,
      RbacService.CACHE_TTL_SECONDS,
    );

    return permissionMap;
  }

  async getPermissionProfile(userId: string): Promise<PermissionProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { feature: true },
              where: { feature: { isActive: true } },
            },
          },
        },
      },
    });

    if (!user) {
      return { roleKey: '', roleName: '', homeModule: '/finance', permissions: {} };
    }

    return {
      roleKey: user.role.key,
      roleName: user.role.name,
      homeModule: user.role.homeModule,
      permissions: Object.fromEntries(
        user.role.permissions.map((p) => [
          p.feature.key,
          { canRead: p.canRead, canWrite: p.canWrite },
        ]),
      ),
    };
  }

  /**
   * IDs of active users whose role grants the given feature/action. Lets
   * business queries ("which users are sales agents?") be expressed as a
   * capability ("who can own commissions?") instead of a hardcoded role key,
   * so custom roles with the same features behave identically.
   */
  async findUserIdsWithFeature(
    featureKey: string,
    action: 'read' | 'write',
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        role: {
          permissions: {
            some: {
              feature: { key: featureKey, isActive: true },
              ...(action === 'read' ? { canRead: true } : { canWrite: true }),
            },
          },
        },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.del(`rbac:user:${userId}`);
  }

  async invalidateRoleCache(roleId: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { roleId },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.cache.del(`rbac:user:${u.id}`)),
    );
  }
}
