// ============================================
// PT Workout Tracker - Bottom Tab Navigator
// ============================================

import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { colors } from '../lib/theme';

// Screens
import { ClientListScreen } from '../screens/ClientListScreen';
import { WorkoutListScreen } from '../screens/WorkoutListScreen';
import { ExerciseLibraryScreen } from '../screens/ExerciseLibraryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// ============================================
// Tab Configuration
// ============================================

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  icon: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ icon, focused }) => (
  <Text
    style={[
      styles.tabIcon,
      { opacity: focused ? 1 : 0.7 },
    ]}
  >
    {icon}
  </Text>
);

// ============================================
// Component
// ============================================

export const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Clients"
        component={ClientListScreen}
        options={{
          tabBarLabel: 'Klienter',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDC65'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutListScreen}
        options={{
          tabBarLabel: 'Pass',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83C\uDFCB\uFE0F'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExerciseLibraryScreen}
        options={{
          tabBarLabel: '\u00D6vningar',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDCDA'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\u2699\uFE0F'} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 22,
  },
});
