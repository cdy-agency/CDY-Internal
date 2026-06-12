import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { ItManagementService } from './it-management.service';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';
import { FeaturesController } from './features.controller';
import { RbacBootstrapService } from './rbac-bootstrap.service';

@Module({
  controllers: [RolesController, UsersController, FeaturesController],
  providers: [RbacService, ItManagementService, RbacBootstrapService],
  exports: [RbacService],
})
export class RbacModule {}
