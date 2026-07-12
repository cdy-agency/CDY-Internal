import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { encodePermissions, UserProfile } from '@cdy/shared';
import { JwtPayload } from './decorators/current-user.decorator';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rbacService: RbacService,
  ) {}

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  }> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        isActive: true,
      },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const profile = await this.rbacService.getPermissionProfile(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleKey: profile.roleKey,
      roleName: profile.roleName,
      homeModule: profile.homeModule,
      perms: encodePermissions(profile.permissions),
    };

    const tokens = await this.generateTokens(payload);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        roleKey: profile.roleKey,
        roleName: profile.roleName,
        homeModule: profile.homeModule,
        firstName: user.firstName,
        lastName: user.lastName,
        permissions: profile.permissions,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.sub,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const profile = await this.rbacService.getPermissionProfile(user.id);

      const accessPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        roleKey: profile.roleKey,
        roleName: profile.roleName,
        homeModule: profile.homeModule,
        perms: encodePermissions(profile.permissions),
      };

      const accessToken = await this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        isActive: true,
      },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = await this.rbacService.getPermissionProfile(userId);

    return {
      id: user.id,
      email: user.email,
      roleKey: profile.roleKey,
      roleName: profile.roleName,
      homeModule: profile.homeModule,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: profile.permissions,
    };
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const refreshPayload = { sub: payload.sub };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
