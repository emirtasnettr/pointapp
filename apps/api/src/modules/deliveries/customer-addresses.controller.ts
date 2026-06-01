import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CustomerJwtUser } from '../auth/strategies/customer-jwt.strategy';
import { CustomerSavedAddressesService } from './customer-saved-addresses.service';
import { CreateCustomerSavedAddressDto, UpdateCustomerSavedAddressDto } from './dto/customer-saved-address.dto';

@Controller('customer/addresses')
@UseGuards(AuthGuard('customer-jwt'))
export class CustomerAddressesController {
  constructor(private readonly saved: CustomerSavedAddressesService) {}

  @Get()
  list(@Req() req: Request & { user: CustomerJwtUser }) {
    return this.saved.list(req.user.customerProfileId);
  }

  @Get(':id')
  getOne(@Req() req: Request & { user: CustomerJwtUser }, @Param('id') id: string) {
    return this.saved.getOne(req.user.customerProfileId, id);
  }

  @Post()
  create(@Req() req: Request & { user: CustomerJwtUser }, @Body() dto: CreateCustomerSavedAddressDto) {
    return this.saved.create(req.user.customerProfileId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request & { user: CustomerJwtUser },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerSavedAddressDto,
  ) {
    return this.saved.update(req.user.customerProfileId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request & { user: CustomerJwtUser }, @Param('id') id: string) {
    return this.saved.remove(req.user.customerProfileId, id);
  }
}
