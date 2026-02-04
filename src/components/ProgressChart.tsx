import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ============================================
// Props
// ============================================
interface DataPoint {
  date: string;
  value: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  title?: string;
  unit?: string;
  color?: string;
}

// ============================================
// Helpers
// ============================================
const CHART_HEIGHT = 160;
const CHART_PADDING_LEFT = 48;
const CHART_PADDING_RIGHT = 16;
const DOT_SIZE = 8;

function formatDateLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return dateStr.slice(5, 10);
  }
}

function getLineBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { left: number; top: number; width: number; rotation: string } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return {
    left: x1,
    top: y1,
    width: length,
    rotation: `${angle}deg`,
  };
}

// ============================================
// Component
// ============================================
export default function ProgressChart({
  data,
  title,
  unit = '',
  color = '#F7E928',
}: ProgressChartProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'\u2014'}</Text>
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1; // avoid division by zero
  const padding = range * 0.1;
  const adjustedMin = minVal - padding;
  const adjustedMax = maxVal + padding;
  const adjustedRange = adjustedMax - adjustedMin;

  // Generate Y-axis tick values (3 ticks)
  const yTicks = [adjustedMin, adjustedMin + adjustedRange / 2, adjustedMax];

  // Calculate point positions (percentage-based, rendered later)
  const points = data.map((d, i) => {
    const xPercent =
      data.length === 1 ? 0.5 : i / (data.length - 1);
    const yPercent = 1 - (d.value - adjustedMin) / adjustedRange;
    return { xPercent, yPercent, value: d.value, date: d.date };
  });

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>
          {title}
          {unit ? ` (${unit})` : ''}
        </Text>
      )}

      <View style={styles.chartWrapper}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {yTicks
            .slice()
            .reverse()
            .map((tick, i) => (
              <Text key={i} style={styles.yLabel}>
                {Number.isInteger(tick) ? tick : tick.toFixed(1)}
              </Text>
            ))}
        </View>

        {/* Chart Area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((pos, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { top: `${pos * 100}%` },
              ]}
            />
          ))}

          {/* Lines between points */}
          {points.map((point, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            return (
              <View
                key={`line-${i}`}
                style={[
                  styles.lineSegmentContainer,
                  { width: '100%', height: '100%' },
                ]}
                pointerEvents="none"
              >
                <LineSegment
                  x1Pct={prev.xPercent}
                  y1Pct={prev.yPercent}
                  x2Pct={point.xPercent}
                  y2Pct={point.yPercent}
                  color={color}
                />
              </View>
            );
          })}

          {/* Data points */}
          {points.map((point, i) => (
            <View
              key={`dot-${i}`}
              style={[
                styles.dot,
                {
                  backgroundColor: color,
                  left: `${point.xPercent * 100}%`,
                  top: `${point.yPercent * 100}%`,
                  marginLeft: -DOT_SIZE / 2,
                  marginTop: -DOT_SIZE / 2,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxis, { marginLeft: CHART_PADDING_LEFT }]}>
        {data.length <= 7
          ? data.map((d, i) => (
              <Text
                key={i}
                style={[
                  styles.xLabel,
                  {
                    left: `${(data.length === 1 ? 50 : (i / (data.length - 1)) * 100)}%`,
                  },
                ]}
              >
                {formatDateLabel(d.date)}
              </Text>
            ))
          : // Show first, middle, last for many data points
            [0, Math.floor(data.length / 2), data.length - 1].map((idx) => (
              <Text
                key={idx}
                style={[
                  styles.xLabel,
                  {
                    left: `${(idx / (data.length - 1)) * 100}%`,
                  },
                ]}
              >
                {formatDateLabel(data[idx].date)}
              </Text>
            ))}
      </View>
    </View>
  );
}

// ============================================
// LineSegment sub-component
// ============================================
function LineSegment({
  x1Pct,
  y1Pct,
  x2Pct,
  y2Pct,
  color,
}: {
  x1Pct: number;
  y1Pct: number;
  x2Pct: number;
  y2Pct: number;
  color: string;
}) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={() => {}}
      pointerEvents="none"
    >
      <View
        style={{
          position: 'absolute',
          left: `${x1Pct * 100}%`,
          top: `${y1Pct * 100}%`,
          width: `${Math.sqrt(
            Math.pow((x2Pct - x1Pct) * 100, 2) +
              Math.pow((y2Pct - y1Pct) * 100, 2)
          )}%`,
          height: 2,
          backgroundColor: color,
          transformOrigin: 'left center',
          transform: [
            {
              rotate: `${Math.atan2(
                (y2Pct - y1Pct) * 100,
                (x2Pct - x1Pct) * 100
              ) * (180 / Math.PI)}deg`,
            },
          ],
        }}
      />
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: CHART_PADDING_LEFT - 8,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontVariant: ['tabular-nums'],
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  lineSegmentContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  xAxis: {
    height: 24,
    marginTop: 8,
    position: 'relative',
  },
  xLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#8E8E93',
    transform: [{ translateX: -20 }],
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 24,
    color: '#3A3A3C',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
