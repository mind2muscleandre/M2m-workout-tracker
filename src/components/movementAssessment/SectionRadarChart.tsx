import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';

const LABELS = ['Hållning', 'Rörlighet', 'Kärna', 'Stabilitet'];

interface Props {
  postural: number;
  mobility: number | null;
  core: number | null;
  stability: number;
  size?: number;
}

export function SectionRadarChart({
  postural,
  mobility,
  core,
  stability,
  size = 220,
}: Props) {
  const values = [postural, mobility ?? 0, core ?? 0, stability];
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const n = 4;

  const point = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPoints = values.map((v, i) => {
    const clamped = Math.max(0, Math.min(100, v)) / 100;
    return point(i, maxR * clamped);
  });
  const poly = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const labelOffset = size * 0.42;
  const labelPositions = LABELS.map((label, i) => {
    const p = point(i, maxR + labelOffset * 0.35);
    return { label, x: p.x, y: p.y, i };
  });

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        {gridLevels.map((lvl) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const p = point(i, maxR * lvl);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <Polygon
              key={lvl}
              points={pts}
              fill="none"
              stroke="#3A3A3C"
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}
        {Array.from({ length: n }, (_, i) => {
          const outer = point(i, maxR);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#3A3A3C"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}
        <Polygon points={poly} fill="#F7E92833" stroke="#F7E928" strokeWidth={2} />
        {labelPositions.map(({ label, x, y }) => (
          <SvgText
            key={label}
            x={x}
            y={y}
            fill="#8E8E93"
            fontSize={11}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {label}
          </SvgText>
        ))}
      </Svg>
      <View style={styles.legend}>
        {LABELS.map((label, i) => (
          <Text key={label} style={styles.legendText}>
            {label}: {Math.round(values[i])}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  legend: { marginTop: 8, gap: 4 },
  legendText: { color: '#8E8E93', fontSize: 12 },
});
