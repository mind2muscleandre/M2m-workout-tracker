// ============================================
// PT Workout Tracker - Root App Navigator
// ============================================

import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { colors } from '../lib/theme';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from '../components/LoadingScreen';

// Navigation
import { MainTabs } from './MainTabs';

// Screens
import AuthScreen from '../screens/AuthScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import { WorkoutCreateScreen } from '../screens/WorkoutCreateScreen';
import { WorkoutActiveScreen } from '../screens/WorkoutActiveScreen';
import { ExercisePickerScreen } from '../screens/ExercisePickerScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { ProgressionScreen } from '../screens/ProgressionScreen';

// ============================================
// Navigation Theme
// ============================================

const navigationTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

// ============================================
// Stack Navigator
// ============================================

const Stack = createNativeStackNavigator<RootStackParamList>();

// ============================================
// Component
// ============================================

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={{ title: 'Klientdetaljer' }}
            />
            <Stack.Screen
              name="WorkoutCreate"
              component={WorkoutCreateScreen}
              options={{ title: 'Skapa pass' }}
            />
            <Stack.Screen
              name="WorkoutActive"
              component={WorkoutActiveScreen}
              options={{
                title: 'Aktivt pass',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="ExercisePicker"
              component={ExercisePickerScreen}
              options={{
                title: 'V\u00E4lj \u00F6vning',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="ExerciseDetail"
              component={ExerciseDetailScreen}
              options={{ title: '\u00D6vningsdetaljer' }}
            />
            <Stack.Screen
              name="Progression"
              component={ProgressionScreen}
              options={{ title: 'Progression' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
