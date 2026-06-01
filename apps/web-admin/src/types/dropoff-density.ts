/** Dashboard haritası + `GET /stats/dashboard` `dropoffPoints` alanı */
export type DropoffDensityPoint = {
  orderNumber: number;
  status: string;
  lat: number;
  lng: number;
  label?: string;
};

/** `GET /stats/dashboard` `courierMapPoints` — son konum (kuryede aktif teslimat) */
export type CourierMapPoint = {
  publicId: string;
  lat: number;
  lng: number;
  orderNumber: number;
};
