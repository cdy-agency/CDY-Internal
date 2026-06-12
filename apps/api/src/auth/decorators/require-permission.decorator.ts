import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  featureKey: string;
  action: 'read' | 'write';
}

export const RequirePermission = (
  featureKey: string,
  action: 'read' | 'write',
): ReturnType<typeof SetMetadata> =>
  SetMetadata(PERMISSION_KEY, { featureKey, action } satisfies RequiredPermission);
