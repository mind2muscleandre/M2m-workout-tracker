import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'coach_onboarding_complete';

export async function isCoachOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

export async function markCoachOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, '1');
}
