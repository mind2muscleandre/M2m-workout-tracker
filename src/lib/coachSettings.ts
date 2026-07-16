import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'coach_notification_settings_v1';

export type CoachNotificationSettings = {
  clientAlerts: boolean;
  screeningResultsNotif: boolean;
  chatNotif: boolean;
  weeklySummaryNotif: boolean;
};

export const DEFAULT_COACH_NOTIFICATION_SETTINGS: CoachNotificationSettings = {
  clientAlerts: true,
  screeningResultsNotif: true,
  chatNotif: true,
  weeklySummaryNotif: false,
};

export async function loadCoachNotificationSettings(): Promise<CoachNotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COACH_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_COACH_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COACH_NOTIFICATION_SETTINGS;
  }
}

export async function saveCoachNotificationSettings(
  settings: CoachNotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — settings simply reset to defaults next launch.
  }
}
