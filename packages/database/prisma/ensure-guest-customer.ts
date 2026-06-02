/**
 * Üyeliksiz gönderi (POST /v1/public/deliveries) için BM000099 profilini oluşturur.
 * Mevcut veriyi silmez; yoksa ekler.
 */
import { CustomerType, PrismaClient, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const GUEST_CUSTOMER_PHONE = '+905099999999';
export const GUEST_CUSTOMER_PUBLIC_ID = 'BM000099';

const prisma = new PrismaClient();

export async function ensureGuestCustomerProfile(): Promise<void> {
  const existing = await prisma.customerProfile.findUnique({
    where: { publicId: GUEST_CUSTOMER_PUBLIC_ID },
    select: { id: true },
  });
  if (existing) {
    console.log('Misafir profil zaten var:', GUEST_CUSTOMER_PUBLIC_ID);
    return;
  }

  const phoneTaken = await prisma.user.findUnique({ where: { phone: GUEST_CUSTOMER_PHONE } });
  if (phoneTaken) {
    const linked = await prisma.customerProfile.findUnique({ where: { userId: phoneTaken.id } });
    if (linked) {
      console.log('Telefon mevcut, müşteri profili:', linked.publicId);
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
  console.log('Misafir profil oluşturuldu:', GUEST_CUSTOMER_PUBLIC_ID);
}

async function main() {
  await ensureGuestCustomerProfile();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
