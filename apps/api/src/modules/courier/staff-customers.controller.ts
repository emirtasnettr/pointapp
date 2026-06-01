import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from '../auth/rbac/require-permissions.decorator';
import { StaffPermissionsGuard } from '../auth/rbac/staff-permissions.guard';
import { StaffPerm } from '../auth/rbac/staff-permissions';
import { AdjustCustomerWalletDto } from './dto/adjust-customer-wallet.dto';
import { CreateStaffCustomerDto } from './dto/create-staff-customer.dto';
import { ListStaffCustomersDto } from './dto/list-staff-customers.dto';
import { SetCourierUserStatusDto } from './dto/set-courier-user-status.dto';
import { StaffSetPasswordDto } from './dto/staff-set-password.dto';
import { UpdateStaffCustomerDto } from './dto/update-staff-customer.dto';
import { StaffCustomersService } from './staff-customers.service';

@Controller('staff/customers')
@UseGuards(AuthGuard('staff-jwt'), StaffPermissionsGuard)
@RequirePermissions(StaffPerm.DELIVERIES_READ)
export class StaffCustomersController {
  constructor(private readonly staffCustomers: StaffCustomersService) {}

  @Post()
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  create(@Body() body: CreateStaffCustomerDto) {
    return this.staffCustomers.create(body);
  }

  @Get()
  list(@Query() query: ListStaffCustomersDto) {
    return this.staffCustomers.list(query);
  }

  @Patch(':publicId/status')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  setStatus(@Param('publicId') publicId: string, @Body() body: SetCourierUserStatusDto) {
    return this.staffCustomers.setUserStatus(publicId, body);
  }

  @Patch(':publicId/password')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  setPassword(@Param('publicId') publicId: string, @Body() body: StaffSetPasswordDto) {
    return this.staffCustomers.setPassword(publicId, body.password);
  }

  @Post(':publicId/wallet-adjustment')
  @RequirePermissions(StaffPerm.FINANCE_WRITE)
  adjustWallet(@Param('publicId') publicId: string, @Body() body: AdjustCustomerWalletDto) {
    return this.staffCustomers.adjustWallet(publicId, body);
  }

  @Patch(':publicId')
  @RequirePermissions(StaffPerm.DELIVERIES_WRITE)
  updateProfile(@Param('publicId') publicId: string, @Body() body: UpdateStaffCustomerDto) {
    return this.staffCustomers.updateProfile(publicId, body);
  }

  @Get(':publicId')
  get(@Param('publicId') publicId: string) {
    return this.staffCustomers.getByPublicId(publicId);
  }
}
