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

// ============================================
// Navigation Theme
// ============================================

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string = 'A') => {
  fetch('http://127.0.0.1:7245/ingest/02e11a2b-a3b0-46ff-a481-9b2a69f4cc9c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    })
  }).catch(() => {});
};
// #endregion

// #region agent log
logDebug('AppNavigator.tsx:47', 'Checking DefaultTheme structure', {
  defaultThemeKeys: DefaultTheme ? Object.keys(DefaultTheme) : 'DefaultTheme is null/undefined',
  defaultThemeHasFonts: DefaultTheme && 'fonts' in DefaultTheme,
  defaultThemeHasColors: DefaultTheme && 'colors' in DefaultTheme
}, 'B');
// #endregion

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

// #region agent log
logDebug('AppNavigator.tsx:64', 'navigationTheme created (spreading DefaultTheme)', {
  hasColors: !!navigationTheme.colors,
  hasFonts: 'fonts' in navigationTheme,
  themeKeys: Object.keys(navigationTheme),
  colorsKeys: navigationTheme.colors ? Object.keys(navigationTheme.colors) : [],
  fontsKeys: navigationTheme.fonts ? Object.keys(navigationTheme.fonts) : [],
  hasFontsRegular: navigationTheme.fonts && 'regular' in navigationTheme.fonts,
  fontsRegularValue: navigationTheme.fonts?.regular,
  defaultThemeHadFonts: !!DefaultTheme.fonts,
  usedSafeguard: !DefaultTheme.fonts,
  hasDark: 'dark' in navigationTheme,
  darkType: typeof (navigationTheme as any).dark,
  darkValue: (navigationTheme as any).dark
}, 'A');
// #endregion

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

  // #region agent log
  logDebug('AppNavigator.tsx:112', 'Values from useAuthStore (via selectors)', {
    isLoadingType: typeof isLoading,
    isLoadingValue: isLoading,
    isLoadingStringified: String(isLoading),
    isAuthenticatedType: typeof isAuthenticated,
    isAuthenticatedValue: isAuthenticated,
    isAuthenticatedStringified: String(isAuthenticated),
    isLoadingIsPrimitive: isLoading === true || isLoading === false,
    isAuthenticatedIsPrimitive: isAuthenticated === true || isAuthenticated === false
  }, 'D');
  // #endregion

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

  // #region agent log
  logDebug('AppNavigator.tsx:130', 'After valueOf conversion', {
    isLoadingBoolType: typeof isLoadingBool,
    isLoadingBoolValue: isLoadingBool,
    isLoadingBoolConstructor: isLoadingBool?.constructor?.name,
    isLoadingIsPrimitive: isLoadingBool === true || isLoadingBool === false,
    isAuthenticatedBoolType: typeof isAuthenticatedBool,
    isAuthenticatedBoolValue: isAuthenticatedBool,
    isAuthenticatedBoolConstructor: isAuthenticatedBool?.constructor?.name,
    isAuthenticatedIsPrimitive: isAuthenticatedBool === true || isAuthenticatedBool === false
  }, 'D');
  // #endregion

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

  // #region agent log
  logDebug('AppNavigator.tsx:71', 'Rendering NavigationContainer (POST-FIX)', {
    themeHasFonts: 'fonts' in navigationTheme,
    themeHasColors: 'colors' in navigationTheme,
    themeStructure: JSON.stringify(Object.keys(navigationTheme)),
    fontsRegularExists: navigationTheme.fonts && 'regular' in navigationTheme.fonts
  }, 'A');
  // #endregion

  // #region agent log
  try {
    // Test access to fonts.regular before passing to NavigationContainer
    const testFontsRegular = navigationTheme.fonts?.regular;
    logDebug('AppNavigator.tsx:119', 'Testing fonts.regular access before NavigationContainer', {
      fontsRegularValue: testFontsRegular,
      fontsRegularType: typeof testFontsRegular,
      fontsObject: navigationTheme.fonts ? Object.keys(navigationTheme.fonts) : 'fonts is undefined'
    }, 'C');
  } catch (error: any) {
    logDebug('AppNavigator.tsx:119', 'ERROR accessing fonts.regular', {
      errorMessage: error?.message,
      errorStack: error?.stack
    }, 'C');
  }
  // #endregion

  // #region agent log
  // POST-FIX: Using JS stack with headers disabled
  logDebug('AppNavigator.tsx:175', 'screenOptions before Stack.Navigator (headers disabled)', {
    screenOptionsKeys: Object.keys(screenOptions),
    headerShown: screenOptions.headerShown,
    cardStyleType: typeof screenOptions.cardStyle,
    detachInactiveScreens: screenOptions.detachInactiveScreens,
    navigationThemeKeys: Object.keys(navigationTheme),
    navigationThemeHasDark: 'dark' in navigationTheme,
  }, 'E');
  // #endregion

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={screenOptions}
      >
        {(() => {
          // #region agent log
          const showAuth = !isAuthenticatedBool;
          logDebug('AppNavigator.tsx:189', 'Before conditional render', {
            isAuthenticatedBoolType: typeof isAuthenticatedBool,
            isAuthenticatedBoolValue: isAuthenticatedBool,
            showAuthType: typeof showAuth,
            showAuthValue: showAuth
          }, 'E');
          // #endregion
          
          // Use explicit boolean literals directly in options to avoid any serialization issues
          // Log all options before passing to Stack.Screen
          const authOptions = { headerShown: false };
          const mainTabsOptions = { headerShown: false };
          const workoutActiveOptions = {
            title: 'Aktivt pass',
            gestureEnabled: false,
          };
          
          // #region agent log
          logDebug('AppNavigator.tsx:242', 'Screen options before Stack.Screen', {
            authOptionsHeaderShownType: typeof authOptions.headerShown,
            authOptionsHeaderShownValue: authOptions.headerShown,
            mainTabsOptionsHeaderShownType: typeof mainTabsOptions.headerShown,
            mainTabsOptionsHeaderShownValue: mainTabsOptions.headerShown,
            workoutActiveOptionsGestureEnabledType: typeof workoutActiveOptions.gestureEnabled,
            workoutActiveOptionsGestureEnabledValue: workoutActiveOptions.gestureEnabled
          }, 'F');
          // #endregion
          
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
