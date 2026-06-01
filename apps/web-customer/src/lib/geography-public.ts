import { apiGet, apiPost, apiPostAuth } from '@/lib/api';

export type GeoDistrict = { id: string; name: string; regionId: string };
export type GeoNeighborhood = { id: string; name: string; districtId: string; extraFee: string };

export type DeliveryQuote = {
  serviceAmount: string;
  vatAmount: string;
  totalPrice: string;
};

export function fetchGeoDistricts() {
  return apiGet<GeoDistrict[]>('/geography/districts');
}

export function fetchGeoNeighborhoods(districtId: string) {
  return apiGet<GeoNeighborhood[]>(
    `/geography/neighborhoods?districtId=${encodeURIComponent(districtId)}`,
  );
}

export function fetchDeliveryQuote(body: {
  pickupDistrictId: string;
  pickupNeighborhoodId: string;
  dropoffDistrictId: string;
  dropoffNeighborhoodId: string;
  type?: 'DOCUMENT' | 'PACKAGE';
  vehicleType?: 'MOTORCYCLE' | 'CAR';
  weightKg?: number;
}) {
  return apiPost<DeliveryQuote>('/geography/quote', body);
}

export type CustomerDeliveryQuoteRequest = {
  type: 'DOCUMENT' | 'PACKAGE';
  vehicleType: 'MOTORCYCLE' | 'CAR';
  weightKg?: number;
  pickupSavedAddressId?: string;
  pickupDistrictId?: string;
  pickupNeighborhoodId?: string;
  dropoffSavedAddressId?: string;
  dropoffDistrictId?: string;
  dropoffNeighborhoodId?: string;
};

export function fetchCustomerDeliveryQuote(body: CustomerDeliveryQuoteRequest) {
  return apiPostAuth<DeliveryQuote>('/customer/deliveries/quote', body);
}

export function createGuestDelivery(body: unknown) {
  return apiPost<{ orderNumber: number; id: string }>('/public/deliveries', body);
}
