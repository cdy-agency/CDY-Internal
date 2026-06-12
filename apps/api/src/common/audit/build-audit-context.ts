import { Request } from 'express';
import { JwtPayload } from '../../auth/decorators/current-user.decorator';
import { AuditContext } from './audit.context';

export function buildAuditContext(user: JwtPayload, req: Request): AuditContext {
  const userAgent = req.headers['user-agent'];
  return {
    userId: user.sub,
    userEmail: user.email,
    ipAddress: req.ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
    userRoleKey: user.roleKey,
  };
}
