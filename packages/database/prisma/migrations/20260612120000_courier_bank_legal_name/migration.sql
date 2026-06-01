-- Kurye banka ödemesi: IBAN; hesap sahibi adı User üzerindeki yasal ad ile eşleşmeli
ALTER TABLE "users" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

ALTER TABLE "courier_profiles" ADD COLUMN "iban" VARCHAR(34);
