import { Body, Controller, Get, Param, Patch, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { StaffJwtUser } from '../auth/strategies/staff-jwt.strategy';
import { ListStaffPayoutRequestsDto } from './dto/list-staff-payout-requests.dto';
import { PatchStaffPayoutRequestDto } from './dto/patch-staff-payout-request.dto';
import { StaffPayoutRequestsService } from './staff-payout-requests.service';

@Controller('staff/payout-requests')
@UseGuards(AuthGuard('staff-jwt'))
export class StaffPayoutRequestsController {
  constructor(private readonly staffPayouts: StaffPayoutRequestsService) {}

  @Get()
  list(@Query() query: ListStaffPayoutRequestsDto) {
    return this.staffPayouts.list(query);
  }

  @Get(':id/invoice')
  invoice(@Param('id') id: string): Promise<StreamableFile> {
    return this.staffPayouts.streamInvoice(id);
  }

  @Patch(':id')
  patch(
    @Req() req: Request & { user: StaffJwtUser },
    @Param('id') id: string,
    @Body() body: PatchStaffPayoutRequestDto,
  ) {
    return this.staffPayouts.patch(id, body, req.user.userId);
  }
}
