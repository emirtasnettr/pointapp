import { useRouter } from 'expo-router';
import { SavedAddressForm } from '../../components/SavedAddressForm';
import { apiPostAuth } from '../../lib/api';

export default function NewSavedAddressScreen() {
  const router = useRouter();
  return (
    <SavedAddressForm
      onSubmit={async (body) => {
        await apiPostAuth('/customer/addresses', body);
        router.back();
      }}
    />
  );
}
