import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

// ============================================
// Props
// ============================================
interface LoadingScreenProps {
  message?: string;
}

// ============================================
// Component
// ============================================
export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F7E928" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default LoadingScreen;
