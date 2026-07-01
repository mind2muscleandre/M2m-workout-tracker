import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useCoachFonts } from './src/lib/useCoachFonts';
import { coachColors } from './src/lib/theme';

if (Platform.OS === 'web') {
  require('./web.css');
}

export default function App() {
  const { loaded, error } = useCoachFonts();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const existingStyle = document.getElementById('web-scroll-fix');
      if (existingStyle) existingStyle.remove();

      const style = document.createElement('style');
      style.id = 'web-scroll-fix';
      style.textContent = `
        html, body { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
        #root { height: 100%; width: 100%; overflow: hidden; }
        div[data-scroll-view="true"],
        div[style*="overflow"],
        div[class*="ScrollView"] {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain;
          height: 100% !important;
        }
        div[data-safe-area-view] { height: 100vh !important; overflow: hidden !important; }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
        const root = document.getElementById('root');
        if (root) {
          root.style.height = '100vh';
          root.style.overflow = 'hidden';
        }
      }, 100);
    }
  }, []);

  if (!loaded && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={coachColors.coach} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coachColors.bg,
    ...(Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as const) : null),
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: coachColors.bg,
  },
});
