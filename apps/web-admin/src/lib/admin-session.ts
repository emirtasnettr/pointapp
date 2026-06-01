const TOKEN_KEY = 'point_staff_access_token';
const USER_KEY = 'point_staff_user';

export type StaffSessionUser = {
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  appRole: string;
};

export function getStaffAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStaffUser(): StaffSessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffSessionUser;
  } catch {
    return null;
  }
}

export function setStaffSession(token: string, user: StaffSessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStaffSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
