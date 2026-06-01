/**
 * Monorepo kökünden `npx expo start` çalıştırıldığında net hata.
 * Müşteri uygulaması: npm run dev:mobile:customer
 */
throw new Error(
  'Expo bu dizinden başlatılamaz.\n' +
    '  Müşteri: npm run dev:mobile:customer\n' +
    '  Kurye:   npm run dev:mobile:courier',
);
