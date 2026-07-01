// ============================================
// M2M Coach - Main Tab Navigator
// ============================================

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { coachColors } from '../lib/theme';
import { CoachShell } from '../components/ui/CoachShell';
import { HiddenTabBar } from '../components/ui/HiddenTabBar';

import { DashboardScreen } from '../screens/DashboardScreen';
import { UsersDirectoryScreen } from '../screens/UsersDirectoryScreen';
import { BroadcastScreen } from '../screens/BroadcastScreen';
import { ProgramsTabScreen } from '../screens/ProgramsTabScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { ExerciseLibraryScreen } from '../screens/ExerciseLibraryScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ScreeningTabScreen } from '../screens/ScreeningHubScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs: React.FC = () => {
  return (
    <CoachShell>
      <Tab.Navigator
        tabBar={(props) => <HiddenTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { flex: 1, backgroundColor: coachColors.screenBg },
        }}
        initialRouteName="Dashboard"
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Athletes" component={UsersDirectoryScreen} />
        <Tab.Screen name="Programs" component={ProgramsTabScreen} />
        <Tab.Screen name="Sessions" component={SessionsScreen} />
        <Tab.Screen name="Exercises" component={ExerciseLibraryScreen} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="Broadcast" component={BroadcastScreen} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Reports" component={ReportsScreen} />
        <Tab.Screen name="Screening" component={ScreeningTabScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </CoachShell>
  );
};
