import { useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import { layout } from './theme';
import { debugLog } from './debugLog';

export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

export function useLayout() {
  const { width, height } = useWindowDimensions();

  const mode: LayoutMode =
    width >= layout.desktopBreakpoint
      ? 'desktop'
      : width >= layout.tabletBreakpoint
        ? 'tablet'
        : 'mobile';

  const showDetailPanel = width >= layout.panelBreakpoint;
  const showSidebar = mode !== 'mobile';
  const showBottomNav = mode === 'mobile';

  useEffect(() => {
    // #region agent log
    debugLog({
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'useLayout.ts:layout',
      message: 'layout flags',
      data: {
        width,
        height,
        mode,
        showDetailPanel,
        showSidebar,
        showBottomNav,
        panelBreakpoint: layout.panelBreakpoint,
        desktopBreakpoint: layout.desktopBreakpoint,
      },
    });
    // #endregion
  }, [width, height, mode, showDetailPanel, showSidebar, showBottomNav]);

  return {
    width,
    height,
    mode,
    isMobile: mode === 'mobile',
    isTablet: mode === 'tablet',
    isDesktop: mode === 'desktop',
    showSidebar,
    showBottomNav,
    showDetailPanel,
    sidebarWidth: mode === 'desktop' ? layout.sidebarFull : layout.sidebarIcon,
  };
}
