// ============================================
// PT Workout Tracker - Root App Navigator
// ============================================

import React, { useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
// Using JS stack instead of native-stack to avoid font configuration issues
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StyleSheet, View } from 'react-native';
import type { RootStackParamList } from './types';
import { colors } from '../lib/theme';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from '../components/LoadingScreen';

// Navigation
import { MainTabs } from './MainTabs';

// Screens
import AuthScreen from '../screens/AuthScreen';
import CoachOnboardingScreen from '../screens/CoachOnboardingScreen';
import ClientDetailRedirectScreen from '../screens/ClientDetailRedirectScreen';
import { ClientManageScreen } from '../screens/ClientManageScreen';
import { BroadcastScreen } from '../screens/BroadcastScreen';
import AuthResetScreen from '../screens/AuthResetScreen';
import { AthleteDetailScreen } from '../screens/AthleteDetailScreen';
import { ProgramBuilderScreen } from '../screens/ProgramBuilderScreen';
import { PerformProgramEditorScreen } from '../screens/PerformProgramEditorScreen';
import { CreateSessionScreen } from '../screens/CreateSessionScreen';
import { SessionTimerScreen } from '../screens/SessionTimerScreen';
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
import MovementAssessmentResultScreen from '../screens/MovementAssessmentResultScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import { debugLog } from '../lib/debugLog';
import { isCoachOnboardingComplete } from '../lib/coachOnboarding';

// ============================================
// Navigation Theme
// ============================================

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

const screenOptions = {
  headerShown: false,
  cardStyle: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' ? ({ height: '100%', overflow: 'hidden' } as const) : null),
  },
  detachInactiveScreens: false,
};

const authScreenOptions = { headerShown: false };
const mainTabsOptions = { headerShown: false };
const workoutActiveOptions = {
  title: 'Aktivt pass',
  gestureEnabled: false,
};

function AuthStackNavigator({ initialRouteName }: { initialRouteName: 'Auth' | 'AuthCallback' }) {
  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName={initialRouteName}>
      <Stack.Screen
        name="CoachOnboarding"
        component={CoachOnboardingScreen}
        options={authScreenOptions}
        initialParams={{ flow: 'welcome' }}
      />
      <Stack.Screen name="Auth" component={AuthScreen} options={authScreenOptions} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} options={authScreenOptions} />
      <Stack.Screen name="AuthReset" component={AuthResetScreen} options={authScreenOptions} />
      <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={authScreenOptions} />
    </Stack.Navigator>
  );
}

function MainStackNavigator({ needsOnboarding }: { needsOnboarding: boolean }) {
  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      initialRouteName={needsOnboarding ? 'CoachOnboarding' : 'MainTabs'}
    >
      <Stack.Screen
        name="CoachOnboarding"
        component={CoachOnboardingScreen}
        options={authScreenOptions}
        initialParams={{ flow: 'activation' }}
      />
      <Stack.Screen name="MainTabs" component={MainTabs} options={mainTabsOptions} />
      <Stack.Screen name="ScreeningHub" component={ScreeningHubScreen} options={{ title: 'Screeningar' }} />
      <Stack.Screen name="BatchScreeningUpload" component={BatchScreeningUploadScreen} options={{ title: 'Bild-screening' }} />
      <Stack.Screen
        name="MovementAssessmentClientPick"
        component={MovementAssessmentClientPickScreen}
        options={{ title: 'Välj klient' }}
      />
      <Stack.Screen name="MovementAssessment" component={MovementAssessmentScreen} options={{ title: 'Rörelsebedömning' }} />
      <Stack.Screen
        name="MovementAssessmentProgramBuilder"
        component={MovementAssessmentProgramBuilderScreen}
        options={{ title: 'Åtgärdsprogram' }}
      />
      <Stack.Screen
        name="MovementAssessmentResult"
        component={MovementAssessmentResultScreen}
        options={{ title: 'Bedömning' }}
      />
      <Stack.Screen name="ClientDetail" component={ClientDetailRedirectScreen} options={{ title: 'Klientdetaljer' }} />
      <Stack.Screen name="ClientManage" component={ClientManageScreen} options={{ title: 'Klienthantering' }} />
      <Stack.Screen name="Broadcast" component={BroadcastScreen} options={{ title: 'Broadcast' }} />
      <Stack.Screen name="AthleteDetail" component={AthleteDetailScreen} options={{ title: 'Atletprofil' }} />
      <Stack.Screen name="ProgramBuilder" component={ProgramBuilderScreen} options={{ title: 'Program' }} />
      <Stack.Screen
        name="PerformProgramEditor"
        component={PerformProgramEditorScreen}
        options={{ title: 'Åtgärdsprogram' }}
      />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} options={{ title: 'Ny session' }} />
      <Stack.Screen name="SessionTimer" component={SessionTimerScreen} options={{ title: 'Session' }} />
      <Stack.Screen name="WorkoutCreate" component={WorkoutCreateScreen} options={{ title: 'Skapa pass' }} />
      <Stack.Screen name="WorkoutActive" component={WorkoutActiveScreen} options={workoutActiveOptions} />
      <Stack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{
          title: 'Välj övning',
          cardStyleInterpolator: ({ current: { progress } }: { current: { progress: number } }) => ({
            cardStyle: { opacity: progress },
          }),
        }}
      />
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: 'Övningsdetaljer' }} />
      <Stack.Screen name="Progression" component={ProgressionScreen} options={{ title: 'Progression' }} />
    </Stack.Navigator>
  );
}

// ============================================
// Component
// ============================================

export const AppNavigator: React.FC = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialize = useAuthStore((state) => state.initialize);
  const [onboardingReady, setOnboardingReady] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isLoadingBool = isLoading === true;
  const isAuthenticatedBool = isAuthenticated === true;

  useEffect(() => {
    if (!isAuthenticatedBool) {
      setOnboardingReady(true);
      setNeedsOnboarding(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const done = await isCoachOnboardingComplete();
      if (!cancelled) {
        setNeedsOnboarding(!done);
        setOnboardingReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticatedBool]);

  const hasIncomingAuthLink = useMemo(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      search.includes('code=') ||
      hash.includes('type=recovery') ||
      search.includes('type=recovery')
    );
  }, []);

  if (isLoadingBool || (isAuthenticatedBool && !onboardingReady)) {
    return <LoadingScreen />;
  }

  // #region agent log
  debugLog({
    runId: 'pre-fix',
    hypothesisId: 'H5',
    location: 'AppNavigator.tsx:render',
    message: 'navigator auth state',
    data: {
      isAuthenticatedBool,
      isLoadingBool,
      stack: isAuthenticatedBool ? 'MainStack' : 'AuthStack',
    },
  });
  // #endregion

  const authInitialRoute = hasIncomingAuthLink ? 'AuthCallback' : 'Auth';

  return (
    <NavigationContainer theme={navigationTheme}>
      <View style={navRootStyle}>
        {isAuthenticatedBool ? (
          <MainStackNavigator needsOnboarding={needsOnboarding} />
        ) : (
          <AuthStackNavigator initialRouteName={authInitialRoute} />
        )}
      </View>
    </NavigationContainer>
  );
};

const navRootStyle = StyleSheet.create({
  root: {
    flex: 1,
    ...(Platform.OS === 'web' ? ({ height: '100vh', overflow: 'hidden' } as const) : null),
  },
}).root;
