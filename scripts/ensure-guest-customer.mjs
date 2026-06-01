#!/usr/bin/env node
/**
 * Üyeliksiz gönderi (POST /v1/public/deliveries) için BM000099 profilini oluşturur.
 * Mevcut veriyi silmez; yoksa ekler.
 */
import { PrismaClient, CustomerType, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const GUEST_CUSTOMER_PHONE = '+905099999999';
const GUEST_CUSTOMER_PUBLIC_ID = 'BM000099';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.customerProfile.findUnique({
    where: { publicId: GUEST_CUSTOMER_PUBLIC_ID },
    select: { id: true },
  });
  if (existing) {
    console.log('[ensure-guest-customer] zaten var:', GUEST_CUSTOMER_PUBLIC_ID);
    return;
  }

  const phoneTaken = await prisma.user.findUnique({ where: { phone: GUEST_CUSTOMER_PHONE } });
  if (phoneTaken) {
    const linked = await prisma.customerProfile.findUnique({ where: { userId: phoneTaken.id } });
    if (linked) {
      console.log('[ensure-guest-customer] telefon mevcut, profil:', linked.publicId);
      return;
    }
  }

  const user =
    phoneTaken ??
    (await prisma.user.create({
      data: {
        phone: GUEST_CUSTOMER_PHONE,
        email: 'guest@pointdelivery.com.tr',
        passwordHash: bcrypt.hashSync('guest-not-used', 10),
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        firstName: 'Misafir',
        lastName: 'Gönderi',
      },
    }));

  await prisma.customerProfile.create({
    data: {
      userId: user.id,
      type: CustomerType.INDIVIDUAL,
      publicId: GUEST_CUSTOMER_PUBLIC_ID,
    },
  });
  console.log('[ensure-guest-customer] oluşturuldu:', GUEST_CUSTOMER_PUBLIC_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
