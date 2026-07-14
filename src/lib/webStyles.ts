import { Platform } from 'react-native';

/** Web-only CSS properties — pass as plain object to avoid RN ViewStyle conflicts. */
export function webOnly(style: Record<string, unknown>): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  return style;
}
