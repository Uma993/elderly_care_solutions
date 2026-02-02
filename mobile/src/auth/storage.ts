import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@elderly_care_token';
const USER_KEY = '@elderly_care_user';

export type StoredUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'elderly' | 'family';
  relation?: string;
};

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: StoredUser | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
