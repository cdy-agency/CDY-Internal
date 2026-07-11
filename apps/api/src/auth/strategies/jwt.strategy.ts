import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    // Fail fast at boot rather than silently accepting tokens signed with an
    // empty secret (which would let anyone forge a valid access token).
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    // Re-check the account on every request so a deactivated or deleted user
    // cannot keep operating with a still-valid (unexpired) access token.
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }

    return payload;
  }
}
