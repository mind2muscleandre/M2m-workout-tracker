import { useEffect } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useCoachNavStore } from '../../stores/coachNavStore';

export function HiddenTabBar(props: BottomTabBarProps) {
  const setTabBarProps = useCoachNavStore((s) => s.setTabBarProps);

  useEffect(() => {
    setTabBarProps(props);
  }, [props, setTabBarProps]);

  return null;
}
