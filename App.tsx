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
      const style = document.createElement('style');
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
        [data-scroll-view] {
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      `;
      document.head.appendChild(style);
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
