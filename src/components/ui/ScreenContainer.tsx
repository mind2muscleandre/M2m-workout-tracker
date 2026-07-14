import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { coachColors, layout } from '../../lib/theme';
import { webOnly } from '../../lib/webStyles';
import { debugLog } from '../../lib/debugLog';
import { useLayout } from '../../lib/useLayout';
import { PageHeader } from './PageHeader';

interface ScreenContainerProps {
  title: string;
  subtitle?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  search?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  detailPanel?: React.ReactNode;
}

export function ScreenContainer({
  title,
  subtitle,
  headerLeft,
  headerRight,
  search,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  detailPanel,
}: ScreenContainerProps) {
  const { isMobile, showDetailPanel } = useLayout();

  const body = scroll ? (
    <ScrollView
      style={[styles.scroll, Platform.OS === 'web' && styles.scrollWeb]}
      contentContainerStyle={[
        styles.body,
        isMobile && styles.bodyMobile,
        Platform.OS === 'web' && styles.bodyWeb,
      ]}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      nestedScrollEnabled
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={coachColors.coach}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, styles.fill]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      {!isMobile ? (
        <PageHeader
          title={title}
          subtitle={subtitle}
          left={headerLeft}
          right={headerRight}
          search={search}
        />
      ) : null}
      <View
        style={styles.row}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          // #region agent log
          debugLog({
            runId: 'pre-fix',
            hypothesisId: 'H2-H4',
            location: 'ScreenContainer.tsx:row',
            message: 'row layout',
            data: { rowW: w, rowH: h, showDetailPanel, hasDetailPanel: !!detailPanel, title, isMobile },
          });
          // #endregion
        }}
      >
        <View
          style={styles.main}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            // #region agent log
            debugLog({
              runId: 'pre-fix',
              hypothesisId: 'H4',
              location: 'ScreenContainer.tsx:main',
              message: 'main layout',
              data: { mainW: w, mainH: h, title },
            });
            // #endregion
          }}
        >
          {body}
        </View>
        {showDetailPanel && detailPanel ? (
          <View
            style={styles.panelSlot}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              // #region agent log
              debugLog({
                runId: 'pre-fix',
                hypothesisId: 'H2',
                location: 'ScreenContainer.tsx:panelSlot',
                message: 'panel slot layout',
                data: { panelW: w, panelH: h, title },
              });
              // #endregion
            }}
          >
            {detailPanel}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    ...webOnly({ height: '100%', overflow: 'hidden' }),
  },
  row: { flex: 1, flexDirection: 'row', minHeight: 0 },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  panelSlot: {
    width: layout.panelWidth,
    flexShrink: 0,
    alignSelf: 'stretch',
    minHeight: 0,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollWeb: webOnly({
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    minHeight: 0,
    height: '100%',
  }),
  body: {
    padding: 20,
    paddingBottom: 20,
    ...(Platform.OS !== 'web' ? { flexGrow: 1 } : null),
  },
  bodyWeb: {
    paddingBottom: 48,
  },
  bodyMobile: {
    paddingBottom: 100,
  },
  fill: { flex: 1 },
});
