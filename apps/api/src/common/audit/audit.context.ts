import { Role } from '@cdy/shared';

export interface AuditContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  userRole?: Role;
}
