import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../../auth/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';

@ApiTags('hr-onboarding')
@ApiBearerAuth()
@Controller('hr/employees/:id/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @RequirePermission('hr.employees', 'read')
  @ApiOperation({ summary: 'Get employee onboarding checklist' })
  async getChecklist(@Param('id') id: string) {
    const data = await this.onboardingService.getByEmployeeId(id);
    return { data, message: 'Onboarding retrieved', statusCode: HttpStatus.OK };
  }

  @Patch('items/:itemId')
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Mark onboarding item complete' })
  async markComplete(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const data = await this.onboardingService.markItemComplete(
      id,
      itemId,
      user.sub,
    );
    return { data, message: 'Item marked complete', statusCode: HttpStatus.OK };
  }

  @Delete()
  @RequirePermission('hr.employees', 'write')
  @ApiOperation({ summary: 'Soft-delete employee onboarding checklist' })
  async remove(@Param('id') id: string) {
    const data = await this.onboardingService.remove(id);
    return {
      data,
      message: 'Onboarding checklist deleted',
      statusCode: HttpStatus.OK,
    };
  }
}
