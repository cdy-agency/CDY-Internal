import { SetMetadata } from '@nestjs/common';
import { Role } from '@cdy/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
