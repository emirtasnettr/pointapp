export type GeoDistrict = { id: string; name: string };
export type GeoNeighborhood = { id: string; name: string; districtId: string };

export type SavedAddressRow = {
  id: string;
  title: string;
  line1: string;
  city: string;
  lat: number | null;
  lng: number | null;
  serviceAvailable: boolean;
  serviceUnavailableReason: string | null;
  neighborhood: {
    id: string;
    name: string;
    district: { id: string; name: string };
  } | null;
};

export type CustomerMe = {
  type?: 'INDIVIDUAL' | 'CORPORATE';
  companyName?: string | null;
  senderName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  invoiceAccountEnabled?: boolean;
};
