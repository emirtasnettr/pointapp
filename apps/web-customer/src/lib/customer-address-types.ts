export type CustomerSavedAddressRow = {
  id: string;
  title: string;
  line1: string;
  city: string;
  lat: number | null;
  lng: number | null;
  sortOrder: number;
  serviceAvailable: boolean;
  serviceUnavailableReason: string | null;
  neighborhood: {
    id: string;
    name: string;
    district: { id: string; name: string; region: { id: string; code: string; name: string } };
  } | null;
};
