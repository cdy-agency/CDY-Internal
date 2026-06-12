export type PermissionMap = Record<
  string,
  { canRead: boolean; canWrite: boolean }
>;

export interface PermissionProfile {
  roleKey: string;
  roleName: string;
  permissions: PermissionMap;
}
