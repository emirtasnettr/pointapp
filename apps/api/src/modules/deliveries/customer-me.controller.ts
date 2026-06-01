import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { CustomerJwtUser } from '../auth/strategies/customer-jwt.strategy';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { CustomerChangePasswordDto } from '../auth/dto/customer-change-password.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { customerSenderName } from './customer-display-name.util';

@Controller('customer')
@UseGuards(AuthGuard('customer-jwt'))
export class CustomerMeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerAuth: CustomerAuthService,
  ) {}

  @Get('me')
  async me(@Req() req: Request & { user: CustomerJwtUser }) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!profile) {
      return { customerProfileId: req.user.customerProfileId, customerPublicId: req.user.customerPublicId };
    }
    const senderName = customerSenderName(profile);
    return {
      customerProfileId: profile.id,
      customerPublicId: profile.publicId,
      type: profile.type,
      companyName: profile.companyName,
      senderName: senderName || null,
      email: profile.user.email,
      phone: profile.user.phone,
      firstName: profile.user.firstName,
      lastName: profile.user.lastName,
      invoiceAccountEnabled: profile.invoiceAccountEnabled,
    };
  }

  @Patch('me/password')
  changePassword(
    @Req() req: Request & { user: CustomerJwtUser },
    @Body() body: CustomerChangePasswordDto,
  ) {
    return this.customerAuth.changePassword(req.user.userId, body);
  }
}
