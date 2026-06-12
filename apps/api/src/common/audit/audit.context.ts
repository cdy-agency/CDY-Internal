export interface AuditContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
  userRoleKey?: string;
}
