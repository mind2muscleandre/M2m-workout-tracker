import { create } from 'zustand';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface CoachNavState {
  tabBarProps: BottomTabBarProps | null;
  setTabBarProps: (props: BottomTabBarProps) => void;
}

export const useCoachNavStore = create<CoachNavState>((set) => ({
  tabBarProps: null,
  setTabBarProps: (props) => set({ tabBarProps: props }),
}));
