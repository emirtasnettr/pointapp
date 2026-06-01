-- Aynı müşterinin kampanya kodunu kaç kez kullanabileceği (null = sınırsız)
ALTER TABLE "campaigns" ADD COLUMN "maxUsesPerCustomer" INTEGER;
