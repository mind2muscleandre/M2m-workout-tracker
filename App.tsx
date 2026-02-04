import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

// Import web CSS
if (Platform.OS === 'web') {
  require('./web.css');
}

export default function App() {
  useEffect(() => {
    // Fix scrolling on web
    if (Platform.OS === 'web') {
      // Remove any existing style
      const existingStyle = document.getElementById('web-scroll-fix');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'web-scroll-fix';
      style.textContent = `
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        #root {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        /* Fix all ScrollView instances */
        div[data-scroll-view="true"],
        div[style*="overflow"],
        div[class*="ScrollView"] {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain;
          height: 100% !important;
        }
        /* Fix SafeAreaView on web */
        div[data-safe-area-view] {
          height: 100vh !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);

      // Also add inline styles to root after mount
      setTimeout(() => {
        const root = document.getElementById('root');
        if (root) {
          root.style.height = '100vh';
          root.style.overflow = 'hidden';
        }
      }, 100);
    }
  }, []);

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
    backgroundColor: '#0F0F0F',
  },
});
