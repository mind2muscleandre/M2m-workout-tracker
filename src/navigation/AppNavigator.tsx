// ============================================
// PT Workout Tracker - Root App Navigator
// ============================================

import React, { useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
// Using JS stack instead of native-stack to avoid font configuration issues
import { createStackNavigator } from '@react-navigation/stack';
import { shallow } from 'zustand/shallow';
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
import { BatchScreeningUploadScreen } from '../screens/BatchScreeningUploadScreen';
import ScreeningHubScreen from '../screens/ScreeningHubScreen';
import MovementAssessmentClientPickScreen from '../screens/MovementAssessmentClientPickScreen';
import MovementAssessmentScreen from '../screens/MovementAssessmentScreen';
import MovementAssessmentProgramBuilderScreen from '../screens/MovementAssessmentProgramBuilderScreen';

// ============================================
// Navigation Theme
// ============================================

// Use DefaultTheme directly but override colors
// CRITICAL: Must ALWAYS provide fonts object - DefaultTheme.fonts may be undefined or empty
const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

// ============================================
// Stack Navigator
// ============================================

const Stack = createStackNavigator<RootStackParamList>();

// ============================================
// Component
// ============================================

export const AppNavigator: React.FC = () => {
  // Use separate selectors but ensure consistent hook order by calling them unconditionally
  // This prevents React Native from trying to serialize the entire store object
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Use useMemo to ensure stable boolean primitives that React Native can serialize correctly
  // Force to explicit boolean literals to avoid any serialization issues
  const isLoadingBool: boolean = useMemo(() => {
    const val = isLoading === true || isLoading === false ? isLoading : Boolean(isLoading);
    // Ensure it's a primitive boolean, not a Boolean object
    return val === true ? true : false;
  }, [isLoading]);
  
  const isAuthenticatedBool: boolean = useMemo(() => {
    const val = isAuthenticated === true || isAuthenticated === false ? isAuthenticated : Boolean(isAuthenticated);
    // Ensure it's a primitive boolean, not a Boolean object
    return val === true ? true : false;
  }, [isAuthenticated]);

  // Create screenOptions with useMemo BEFORE any early returns to ensure consistent hook order
  // This must be called unconditionally to follow Rules of Hooks
  // JS stack screenOptions - disable native headers to avoid fonts issue
  const screenOptions = useMemo(() => {
    return {
      headerShown: false, // Disable headers globally to avoid fonts issue
      cardStyle: { backgroundColor: colors.background },
      // Disable react-native-screens integration
      detachInactiveScreens: false,
    };
  }, []);

  if (isLoadingBool) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={screenOptions}
      >
        {(() => {
          const showAuth = !isAuthenticatedBool;

          const authOptions = { headerShown: false };
          const mainTabsOptions = { headerShown: false };
          const workoutActiveOptions = {
            title: 'Aktivt pass',
            gestureEnabled: false,
          };

          if (showAuth) {
            return (
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={authOptions}
              />
            );
          } else {
            return (
              <>
                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={mainTabsOptions}
                />
                <Stack.Screen
                  name="ScreeningHub"
                  component={ScreeningHubScreen}
                  options={{ title: 'Screeningar' }}
                />
                <Stack.Screen
                  name="BatchScreeningUpload"
                  component={BatchScreeningUploadScreen}
                  options={{ title: 'Bild-screening' }}
                />
                <Stack.Screen
                  name="MovementAssessmentClientPick"
                  component={MovementAssessmentClientPickScreen}
                  options={{ title: 'Välj klient' }}
                />
                <Stack.Screen
                  name="MovementAssessment"
                  component={MovementAssessmentScreen}
                  options={{ title: 'Rörelsebedömning' }}
                />
                <Stack.Screen
                  name="MovementAssessmentProgramBuilder"
                  component={MovementAssessmentProgramBuilderScreen}
                  options={{ title: 'Åtgärdsprogram' }}
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
                  options={workoutActiveOptions}
                />
                <Stack.Screen
                  name="ExercisePicker"
                  component={ExercisePickerScreen}
                  options={{
                    title: 'Välj övning',
                    // For JS stack, modal presentation is configured differently
                    cardStyleInterpolator: ({ current: { progress } }: any) => ({
                      cardStyle: {
                        opacity: progress,
                      },
                    }),
                  }}
                />
                <Stack.Screen
                  name="ExerciseDetail"
                  component={ExerciseDetailScreen}
                  options={{ title: 'Övningsdetaljer' }}
                />
                <Stack.Screen
                  name="Progression"
                  component={ProgressionScreen}
                  options={{ title: 'Progression' }}
                />
              </>
            );
          }
        })()}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
