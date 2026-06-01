import {
  PrismaClient,
  PublicIdPrefix,
  CustomerType,
  CourierType,
  UserStatus,
  DeliveryType,
  DeliveryStatus,
  VehicleType,
  PaymentMethod,
  PaymentStatus,
  WalletLedgerType,
  PayoutStatus,
  AppRole,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  ensureIstanbulGeography,
  ensureIstanbulMetroRegion,
  neighborhoodIdFromIndex,
} from './istanbul-geography.seed';
import { ensureIstanbulPriceZonesAndMatrix } from './istanbul-price-matrix.seed';

const prisma = new PrismaClient();

/** Seed sonrası giriş (müşteri web / mobil) */
export const CUSTOMER_DEMO_EMAIL = 'musteri@pointdelivery.com.tr';
export const CUSTOMER_DEMO_PASSWORD = '12345678';

/** Seed sonrası giriş (mobil kurye uygulaması) */
export const COURIER_DEMO_EMAIL = 'kurye@pointdelivery.com.tr';
export const COURIER_DEMO_PASSWORD = '12345678';

/** Seed sonrası giriş (yönetim web paneli) */
export const STAFF_DEMO_EMAIL = 'yonetici@pointdelivery.com.tr';
export const STAFF_DEMO_PASSWORD = '12345678';

/** Üyeliksiz web gönderileri (public/deliveries) */
export const GUEST_CUSTOMER_PHONE = '+905099999999';
export const GUEST_CUSTOMER_PUBLIC_ID = 'BM000099';

function pad(n: number, w: number) {
  return String(n).padStart(w, '0');
}

/** Seed adresleri İstanbul içinde deterministik dağılsın (harita yoğunluğu demosu). */
function geoJitter(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i);
  const u1 = (h >>> 0) / 2 ** 32;
  const u2 = (Math.imul(h, 7919) >>> 0) / 2 ** 32;
  const lat = 40.92 + u1 * 0.28;
  const lng = 28.55 + u2 * 0.85;
  return { lat, lng };
}

function addr(label: string, line: string) {
  const { lat, lng } = geoJitter(`${label}|${line}`);
  return {
    label,
    line1: line,
    city: 'İstanbul',
    lat,
    lng,
  };
}

async function main() {
  const customerPhone = '+905551111001';
  const courierPhone = '+905552222002';
  const staffPhone = '+905553333003';

  await prisma.$transaction(async (tx) => {
    await tx.delivery.deleteMany({});
    await tx.campaign.deleteMany({});
    await tx.courierWallet.deleteMany({});
    await tx.courierProfile.deleteMany({});
    await tx.customerProfile.deleteMany({});
    await tx.staffProfile.deleteMany({});
    await tx.user.deleteMany({
      where: {
        OR: [
          { phone: { in: [customerPhone, courierPhone, staffPhone] } },
          { email: { in: [CUSTOMER_DEMO_EMAIL, COURIER_DEMO_EMAIL, STAFF_DEMO_EMAIL] } },
        ],
      },
    });
    await tx.idSequence.deleteMany({});
    await tx.orderNumberSequence.deleteMany({});

    await tx.idSequence.createMany({
      data: [
        { prefix: PublicIdPrefix.BM, nextValue: 2 },
        { prefix: PublicIdPrefix.BK, nextValue: 2 },
      ],
    });
    await tx.orderNumberSequence.create({ data: { id: 1, nextValue: 1_000_016 } });

    const metro = await ensureIstanbulMetroRegion(tx);
    await ensureIstanbulPriceZonesAndMatrix(tx, metro.regionId);
    const istanbulGeo = await ensureIstanbulGeography(tx);

    const customerUser = await tx.user.create({
      data: {
        phone: customerPhone,
        email: CUSTOMER_DEMO_EMAIL,
        passwordHash: bcrypt.hashSync(CUSTOMER_DEMO_PASSWORD, 10),
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        firstName: 'Bartu',
        lastName: 'Özsöyler',
      },
    });

    const customer = await tx.customerProfile.create({
      data: {
        userId: customerUser.id,
        type: CustomerType.INDIVIDUAL,
        publicId: `${PublicIdPrefix.BM}${pad(1, 6)}`,
      },
    });

    const guestUser = await tx.user.create({
      data: {
        phone: GUEST_CUSTOMER_PHONE,
        email: 'guest@pointdelivery.com.tr',
        passwordHash: bcrypt.hashSync('guest-not-used', 10),
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        firstName: 'Misafir',
        lastName: 'Gönderi',
      },
    });
    await tx.customerProfile.create({
      data: {
        userId: guestUser.id,
        type: CustomerType.INDIVIDUAL,
        publicId: GUEST_CUSTOMER_PUBLIC_ID,
      },
    });

    const demoSaved: {
      title: string;
      line1: string;
      lat: number;
      lng: number;
      sortOrder: number;
      district: string;
      mahalle: string;
    }[] = [
      { title: 'Merkez Ofis', line1: 'Büyükdere Cad. No:199', lat: 41.0847, lng: 29.0164, sortOrder: 0, district: 'Beşiktaş', mahalle: 'Levent Mah.' },
      { title: 'Depo (Dudullu)', line1: 'Dudullu OSB 1. Cd. Lojistik Blok A', lat: 41.028, lng: 29.188, sortOrder: 1, district: 'Ümraniye', mahalle: 'Yukarı Dudullu Mah.' },
      { title: 'Kadıköy Şube', line1: 'Bahariye Cad. No:12 Kat:2', lat: 40.9903, lng: 29.0275, sortOrder: 2, district: 'Kadıköy', mahalle: 'Caferağa Mah.' },
      { title: 'Maslak Anlaşmalı Nokta', line1: 'Atatürk Oto Sanayi Sitesi 2. Kısım', lat: 41.1122, lng: 29.0211, sortOrder: 3, district: 'Sarıyer', mahalle: 'Maslak Mah.' },
      { title: 'Şişli İdari', line1: 'Halaskargazi Cad. No:180 Daire:4', lat: 41.0592, lng: 28.9871, sortOrder: 4, district: 'Şişli', mahalle: 'Esentepe Mah.' },
    ];

    for (const row of demoSaved) {
      const neighborhoodId = neighborhoodIdFromIndex(istanbulGeo, row.district, row.mahalle);
      if (!neighborhoodId) {
        throw new Error(`Seed mahalle eşleşmedi: ${row.district} / ${row.mahalle}`);
      }
      await tx.customerSavedAddress.create({
        data: {
          customerId: customer.id,
          title: row.title,
          line1: row.line1,
          city: 'İstanbul',
          lat: row.lat,
          lng: row.lng,
          sortOrder: row.sortOrder,
          neighborhoodId,
          updatedAt: new Date(),
        },
      });
    }

    const courierUser = await tx.user.create({
      data: {
        phone: courierPhone,
        email: COURIER_DEMO_EMAIL,
        passwordHash: bcrypt.hashSync(COURIER_DEMO_PASSWORD, 10),
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        firstName: 'Demo',
        lastName: 'Kurye',
      },
    });

    const courier = await tx.courierProfile.create({
      data: {
        userId: courierUser.id,
        type: CourierType.INDIVIDUAL,
        publicId: `${PublicIdPrefix.BK}${pad(1, 6)}`,
        vehicleType: VehicleType.MOTORCYCLE,
        plate: '34DK0001',
        iban: 'TR000000000000000000000001',
      },
    });

    const staffUser = await tx.user.create({
      data: {
        phone: staffPhone,
        email: STAFF_DEMO_EMAIL,
        passwordHash: bcrypt.hashSync(STAFF_DEMO_PASSWORD, 10),
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
        firstName: 'Point',
        lastName: 'Yönetici',
      },
    });
    await tx.staffProfile.create({
      data: {
        userId: staffUser.id,
        appRole: AppRole.SYSTEM_ADMIN,
      },
    });

    await tx.auditLog.deleteMany({
      where: { action: { in: ['seed.completed', 'staff.demo_check'] } },
    });

    await tx.auditLog.createMany({
      data: [
        {
          actorUserId: staffUser.id,
          action: 'seed.completed',
          resource: 'database',
          resourceId: null,
          ip: '127.0.0.1',
          userAgent: 'point-prisma-seed',
          diff: { message: 'Demo veri yüklendi' } as Prisma.InputJsonValue,
        },
        {
          actorUserId: staffUser.id,
          action: 'staff.demo_check',
          resource: 'audit',
          resourceId: 'bootstrap',
          ip: null,
          userAgent: null,
          diff: null,
        },
      ],
    });

    const wallet = await tx.courierWallet.create({
      data: {
        courierId: courier.id,
        balance: new Prisma.Decimal('412.50'),
        pending: new Prisma.Decimal(0),
      },
    });

    const basePrice = (total: string) => {
      const t = new Prisma.Decimal(total);
      const rate = new Prisma.Decimal('0.45');
      const commission = t.mul(rate);
      return {
        totalPrice: t,
        commissionRate: rate,
        commissionAmount: commission,
        courierEarning: t.sub(commission),
      };
    };

    await tx.campaign.createMany({
      data: [
        {
          name: 'Yaz indirimi (demo)',
          code: 'DEMO-YAZ2026',
          config: { discountPct: 10, minOrderTry: 100 } as Prisma.InputJsonValue,
          active: true,
          startsAt: null,
          endsAt: new Date('2027-12-31T23:59:59.000Z'),
          maxUsesPerCustomer: 2,
        },
        {
          name: 'Pasif kampanya örneği',
          code: 'DEMO-INACTIVE',
          config: {} as Prisma.InputJsonValue,
          active: false,
          maxUsesPerCustomer: 1,
        },
      ],
    });

    type Spec = {
      orderNumber: number;
      status: DeliveryStatus;
      courierId: string | null;
      description: string;
      type: DeliveryType;
      pickup: ReturnType<typeof addr>;
      dropoff: ReturnType<typeof addr>;
      price: string;
    };

    const specs: Spec[] = [
      { orderNumber: 1_000_001, status: DeliveryStatus.POOL, courierId: null, description: 'Evrak — Kadıköy → Beşiktaş', type: DeliveryType.DOCUMENT, pickup: addr('Kadıköy', 'Moda iskelesi yanı'), dropoff: addr('Beşiktaş', 'Barbaros Bulvarı No:88'), price: '120.00' },
      { orderNumber: 1_000_002, status: DeliveryStatus.POOL, courierId: null, description: 'Evrak — Şişli → Maslak', type: DeliveryType.DOCUMENT, pickup: addr('Şişli', 'Halaskargazi Cd. 120'), dropoff: addr('Maslak', 'AOS 42. Plaza'), price: '95.00' },
      { orderNumber: 1_000_003, status: DeliveryStatus.POOL, courierId: null, description: 'Koli hafif — Üsküdar → Ataşehir', type: DeliveryType.PACKAGE, pickup: addr('Üsküdar', 'Mimar Sinan Mah.'), dropoff: addr('Ataşehir', 'Finans Merkezi'), price: '180.00' },
      { orderNumber: 1_000_004, status: DeliveryStatus.POOL, courierId: null, description: 'Evrak — Bakırköy → Florya', type: DeliveryType.DOCUMENT, pickup: addr('Bakırköy', 'İncirli Metro çıkışı'), dropoff: addr('Florya', 'Depo arkası'), price: '110.00' },
      { orderNumber: 1_000_005, status: DeliveryStatus.POOL, courierId: null, description: 'Evrak acil — Levent → Mecidiyeköy', type: DeliveryType.DOCUMENT, pickup: addr('Levent', 'Kanyon önü'), dropoff: addr('Mecidiyeköy', 'Trump Towers'), price: '85.00' },
      { orderNumber: 1_000_006, status: DeliveryStatus.COURIER_ASSIGNED, courierId: courier.id, description: 'Atandı — test', type: DeliveryType.DOCUMENT, pickup: addr('Alış A', 'Nişantaşı'), dropoff: addr('Teslim A', 'Teşvikiye'), price: '130.00' },
      { orderNumber: 1_000_007, status: DeliveryStatus.COURIER_EN_ROUTE, courierId: courier.id, description: 'Yolda — paket yolda', type: DeliveryType.PACKAGE, pickup: addr('Alış B', 'Zincirlikuyu'), dropoff: addr('Teslim B', '4. Levent'), price: '200.00' },
      { orderNumber: 1_000_008, status: DeliveryStatus.PACKAGE_PICKED_UP, courierId: courier.id, description: 'Alındı — müşteri bekliyor', type: DeliveryType.PACKAGE, pickup: addr('Alış C', 'Gayrettepe'), dropoff: addr('Teslim C', 'Etiler'), price: '155.00' },
      { orderNumber: 1_000_009, status: DeliveryStatus.DELIVERED, courierId: courier.id, description: 'Tamamlandı — dün', type: DeliveryType.DOCUMENT, pickup: addr('Alış D', 'Ortaköy'), dropoff: addr('Teslim D', 'Bebek'), price: '140.00' },
      { orderNumber: 1_000_010, status: DeliveryStatus.DELIVERED, courierId: courier.id, description: 'Tamamlandı — hafta içi', type: DeliveryType.DOCUMENT, pickup: addr('Alış E', 'Fatih'), dropoff: addr('Teslim E', 'Eminönü'), price: '90.00' },
      { orderNumber: 1_000_011, status: DeliveryStatus.DELIVERED, courierId: courier.id, description: 'Tamamlandı — koli', type: DeliveryType.PACKAGE, pickup: addr('Alış F', 'Pendik'), dropoff: addr('Teslim F', 'Kartal'), price: '220.00' },
      { orderNumber: 1_000_012, status: DeliveryStatus.DELIVERED, courierId: courier.id, description: 'Tamamlandı — evrak', type: DeliveryType.DOCUMENT, pickup: addr('Alış G', 'Sarıyer'), dropoff: addr('Teslim G', 'Maslak'), price: '175.00' },
      { orderNumber: 1_000_013, status: DeliveryStatus.DELIVERED, courierId: courier.id, description: 'Tamamlandı — iade yok', type: DeliveryType.DOCUMENT, pickup: addr('Alış H', 'Beylikdüzü'), dropoff: addr('Teslim H', 'Avcılar'), price: '105.00' },
      { orderNumber: 1_000_014, status: DeliveryStatus.CANCELLED, courierId: null, description: 'İptal — havuzdan çıktı', type: DeliveryType.DOCUMENT, pickup: addr('Alış I', 'Silivri'), dropoff: addr('Teslim I', 'Çatalca'), price: '300.00' },
      { orderNumber: 1_000_015, status: DeliveryStatus.PENDING, courierId: null, description: 'Beklemede — ödeme onayı', type: DeliveryType.DOCUMENT, pickup: addr('Alış J', 'Tuzla'), dropoff: addr('Teslim J', 'Gebze'), price: '250.00' },
    ];

    for (const s of specs) {
      const p = basePrice(s.price);
      const row = await tx.delivery.create({
        data: {
          orderNumber: s.orderNumber,
          customerId: customer.id,
          courierId: s.courierId,
          status: s.status,
          type: s.type,
          description: s.description,
          vehicleType: VehicleType.MOTORCYCLE,
          pickupAddress: s.pickup as Prisma.InputJsonValue,
          dropoffAddress: s.dropoff as Prisma.InputJsonValue,
          senderName: 'Demo Gönderen',
          senderPhone: '+905551112233',
          recipientName: 'Demo Alıcı',
          recipientPhone: '+905551114455',
          priceBreakdown: { demo: true, route: s.description } as Prisma.InputJsonValue,
          totalPrice: p.totalPrice,
          commissionRate: p.commissionRate,
          commissionAmount: p.commissionAmount,
          courierEarning: p.courierEarning,
          paymentMethod: PaymentMethod.CARD,
          paymentStatus:
            s.status === DeliveryStatus.DELIVERED || s.status === DeliveryStatus.CANCELLED
              ? PaymentStatus.CAPTURED
              : PaymentStatus.PENDING,
        },
      });
      await tx.deliveryStatusLog.create({
        data: {
          deliveryId: row.id,
          toStatus: s.status,
          actorType: s.courierId ? 'courier' : 'system',
          actorId: s.courierId ? courierUser.id : undefined,
        },
      });
    }

    const pendingAgg = await tx.delivery.aggregate({
      where: {
        courierId: courier.id,
        status: {
          in: [
            DeliveryStatus.COURIER_ASSIGNED,
            DeliveryStatus.COURIER_EN_ROUTE,
            DeliveryStatus.PACKAGE_PICKED_UP,
          ],
        },
      },
      _sum: { courierEarning: true },
    });
    await tx.courierWallet.update({
      where: { id: wallet.id },
      data: { pending: pendingAgg._sum.courierEarning ?? new Prisma.Decimal(0) },
    });

    await tx.walletLedgerEntry.createMany({
      data: [
        {
          walletId: wallet.id,
          amount: new Prisma.Decimal('77.00'),
          type: WalletLedgerType.DELIVERY_EARNING,
          refType: 'delivery',
          meta: { note: 'Demo kazanç 1' } as Prisma.InputJsonValue,
        },
        {
          walletId: wallet.id,
          amount: new Prisma.Decimal('49.50'),
          type: WalletLedgerType.DELIVERY_EARNING,
          refType: 'delivery',
          meta: { note: 'Demo kazanç 2' } as Prisma.InputJsonValue,
        },
        {
          walletId: wallet.id,
          amount: new Prisma.Decimal('-12.00'),
          type: WalletLedgerType.COMMISSION_DEDUCTION,
          refType: 'adjustment',
          meta: {} as Prisma.InputJsonValue,
        },
        {
          walletId: wallet.id,
          amount: new Prisma.Decimal('-200.00'),
          type: WalletLedgerType.PAYOUT,
          refType: 'payout',
          meta: { note: 'Haftalık ödeme (demo)' } as Prisma.InputJsonValue,
        },
      ],
    });

    await tx.payoutRequest.create({
      data: {
        courierId: courier.id,
        amount: new Prisma.Decimal('100.00'),
        status: PayoutStatus.PENDING,
        iban: 'TR000000000000000000000001',
        note: 'Demo ödeme talebi (panelden onaylayabilirsiniz)',
      },
    });

    const settingDefaults: [string, Prisma.InputJsonValue][] = [
      ['system.commissionDefaultPct', 45],
      ['system.nightTariffStart', '22:00'],
      ['system.nightTariffEnd', '06:00'],
      ['system.supportLinePhone', ''],
      ['system.companyLegalTitle', ''],
      ['system.companyTaxNumber', ''],
      ['system.companyTaxOffice', ''],
      ['system.companyAddress', ''],
      ['system.companyEmail', ''],
      ['system.companyPhone', ''],
      ['brand.logoLightUrl', ''],
      ['brand.logoDarkUrl', ''],
      ['sms.provider', 'mock'],
      ['sms.header', 'POINT'],
      ['sms.apiUser', ''],
      ['sms.apiPass', ''],
      ['payment.provider', 'none'],
      ['payment.paytrMerchantId', ''],
      ['payment.paytrMerchantKey', ''],
      ['payment.iyziApiKey', ''],
      ['payment.iyziSecretKey', ''],
    ];
    for (const [key, value] of settingDefaults) {
      await tx.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedByUserId: staffUser.id },
        update: { value, updatedByUserId: staffUser.id },
      });
    }

    await tx.systemSetting.upsert({
      where: { key: 'legal.courier.content.payout-payment-days' },
      create: {
        key: 'legal.courier.content.payout-payment-days',
        value: {
          html: `<h2>Ödeme günleri</h2>
<p>Ödeme talepleriniz hafta içi iş günlerinde (Pazartesi–Cuma) değerlendirilir.</p>
<ul>
<li><strong>Pazartesi–Perşembe</strong> verilen talepler: aynı hafta Cuma günü hesabınıza aktarılır.</li>
<li><strong>Cuma</strong> verilen talepler: bir sonraki hafta Pazartesi işlenir.</li>
</ul>
<p>Resmî tatil ve banka çalışma saatleri dışında yapılan talepler bir sonraki iş gününe kayabilir.</p>
<p><em>Bu metin demo içeriğidir; yönetim panelinden güncelleyebilirsiniz.</em></p>`,
        } as Prisma.InputJsonValue,
        updatedByUserId: staffUser.id,
      },
      update: {
        value: {
          html: `<h2>Ödeme günleri</h2>
<p>Ödeme talepleriniz hafta içi iş günlerinde (Pazartesi–Cuma) değerlendirilir.</p>
<ul>
<li><strong>Pazartesi–Perşembe</strong> verilen talepler: aynı hafta Cuma günü hesabınıza aktarılır.</li>
<li><strong>Cuma</strong> verilen talepler: bir sonraki hafta Pazartesi işlenir.</li>
</ul>
<p>Resmî tatil ve banka çalışma saatleri dışında yapılan talepler bir sonraki iş gününe kayabilir.</p>
<p><em>Bu metin demo içeriğidir; yönetim panelinden güncelleyebilirsiniz.</em></p>`,
        } as Prisma.InputJsonValue,
        updatedByUserId: staffUser.id,
      },
    });

    const pDeliveriesRead = await tx.permission.upsert({
      where: { slug: 'deliveries.read' },
      create: { slug: 'deliveries.read', description: 'Siparişleri listeleme' },
      update: { description: 'Siparişleri listeleme' },
    });
    const pDeliveriesWrite = await tx.permission.upsert({
      where: { slug: 'deliveries.write' },
      create: { slug: 'deliveries.write', description: 'Sipariş oluşturma ve operasyon' },
      update: { description: 'Sipariş oluşturma ve operasyon' },
    });
    const pSettingsManage = await tx.permission.upsert({
      where: { slug: 'settings.manage' },
      create: { slug: 'settings.manage', description: 'Sistem ayarları ve entegrasyonlar' },
      update: { description: 'Sistem ayarları ve entegrasyonlar' },
    });
    const pCampaignsRead = await tx.permission.upsert({
      where: { slug: 'campaigns.read' },
      create: { slug: 'campaigns.read', description: 'Kampanyaları görüntüleme' },
      update: { description: 'Kampanyaları görüntüleme' },
    });

    const roleAdmin = await tx.role.upsert({
      where: { slug: 'system_admin' },
      create: {
        slug: 'system_admin',
        name: 'Sistem yöneticisi',
        description: 'Tüm izinler (RBAC şeması)',
        builtIn: true,
      },
      update: { name: 'Sistem yöneticisi', description: 'Tüm izinler (RBAC şeması)' },
    });
    const roleOps = await tx.role.upsert({
      where: { slug: 'operations_manager' },
      create: {
        slug: 'operations_manager',
        name: 'Operasyon müdürü',
        description: 'Operasyon ve kampanya okuma',
        builtIn: true,
      },
      update: { name: 'Operasyon müdürü', description: 'Operasyon ve kampanya okuma' },
    });

    await tx.rolePermission.deleteMany({
      where: { roleId: { in: [roleAdmin.id, roleOps.id] } },
    });
    await tx.rolePermission.createMany({
      data: [
        { roleId: roleAdmin.id, permissionId: pDeliveriesRead.id },
        { roleId: roleAdmin.id, permissionId: pDeliveriesWrite.id },
        { roleId: roleAdmin.id, permissionId: pSettingsManage.id },
        { roleId: roleAdmin.id, permissionId: pCampaignsRead.id },
        { roleId: roleOps.id, permissionId: pDeliveriesRead.id },
        { roleId: roleOps.id, permissionId: pDeliveriesWrite.id },
        { roleId: roleOps.id, permissionId: pCampaignsRead.id },
      ],
    });
  });

  // eslint-disable-next-line no-console
  console.log(
    'Seed OK: 15 teslimat (havuz 5, kurye aktif 3, teslim 5, iptal 1, beklemede 1). Demo müşteri için 5 kayıtlı adres. Demo kurye: 1 bekleyen ödeme talebi (100 ₺, /payouts).',
  );
  const pool = await prisma.delivery.count({ where: { status: DeliveryStatus.POOL } });
  const active = await prisma.delivery.count({
    where: {
      status: {
        in: [
          DeliveryStatus.COURIER_ASSIGNED,
          DeliveryStatus.COURIER_EN_ROUTE,
          DeliveryStatus.PACKAGE_PICKED_UP,
        ],
      },
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Havuz: ${pool} | Aktif (tüm kuryeler): ${active}`);
  const c = await prisma.customerProfile.findFirst({ where: { publicId: { startsWith: 'BM' } } });
  if (c) {
    // eslint-disable-next-line no-console
    console.log('Demo müşteri customerId (eski env — artık JWT):', c.id);
  }
  // eslint-disable-next-line no-console
  console.log('--- Müşteri web giriş ---');
  // eslint-disable-next-line no-console
  console.log('E-posta:', CUSTOMER_DEMO_EMAIL);
  // eslint-disable-next-line no-console
  console.log('Şifre:', CUSTOMER_DEMO_PASSWORD);
  // eslint-disable-next-line no-console
  console.log(
    'İpucu: API aynı veritabanını kullanmalı — `apps/api/.env` ve `packages/database/.env` içindeki DATABASE_URL eşleşsin.',
  );
  const bk = await prisma.courierProfile.findFirst({ where: { publicId: { startsWith: 'BK' } } });
  if (bk) {
    // eslint-disable-next-line no-console
    console.log('Demo kurye publicId (mobil):', bk.publicId);
  }
  // eslint-disable-next-line no-console
  console.log('--- Kurye mobil giriş ---');
  // eslint-disable-next-line no-console
  console.log('E-posta:', COURIER_DEMO_EMAIL);
  // eslint-disable-next-line no-console
  console.log('Şifre:', COURIER_DEMO_PASSWORD);
  const allCouriers = await prisma.courierProfile.findMany({ select: { publicId: true } });
  // eslint-disable-next-line no-console
  console.log('Tüm kurye publicId:', allCouriers.map((c) => c.publicId).join(', ') || '(yok)');
  // eslint-disable-next-line no-console
  console.log('--- Yönetim web giriş ---');
  // eslint-disable-next-line no-console
  console.log('E-posta:', STAFF_DEMO_EMAIL);
  // eslint-disable-next-line no-console
  console.log('Şifre:', STAFF_DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
