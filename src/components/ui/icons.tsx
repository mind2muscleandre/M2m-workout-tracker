import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../../lib/theme';

type IconProps = { size?: number; color?: string };

export function IconDashboard({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Rect x="2" y="2" width="7" height="7" rx="1.5" />
      <Rect x="11" y="2" width="7" height="7" rx="1.5" />
      <Rect x="2" y="11" width="7" height="7" rx="1.5" />
      <Rect x="11" y="11" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function IconAthletes({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="8" cy="6" r="3" />
      <Path d="M2 18c0-3.3 2.7-6 6-6" />
      <Circle cx="15" cy="9" r="2.5" />
      <Path d="M11 18c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5" />
    </Svg>
  );
}

export function IconPrograms({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Rect x="4" y="2" width="12" height="16" rx="2" />
      <Path d="M8 7h4M8 11h4M8 15h2" />
    </Svg>
  );
}

export function IconSession({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="10" cy="11" r="7" />
      <Path d="M10 7v4l2.5 2.5M7 2h6M10 2v2" />
    </Svg>
  );
}

export function IconMessages({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6l-4 3V5a1 1 0 011-1z" />
    </Svg>
  );
}

export function IconNotes({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M4 2h9l4 4v13a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <Path d="M13 2v4h4M7 9h6M7 13h4" />
    </Svg>
  );
}

export function IconReports({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M4 14l4-5 3 3 4-7" />
      <Rect x="2" y="2" width="16" height="16" rx="2" />
    </Svg>
  );
}

export function IconExercises({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M3 10h14M10 3v14" />
      <Rect x="2" y="8" width="4" height="4" rx="1" />
      <Rect x="14" y="8" width="4" height="4" rx="1" />
    </Svg>
  );
}

export function IconProfile({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="10" cy="7" r="3.5" />
      <Path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Svg>
  );
}

export function IconSearch({ size = 15, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="6.5" cy="6.5" r="4.5" />
      <Path d="M11 11l3 3" />
    </Svg>
  );
}

export function IconClose({ size = 12, color = colors.mutedHi }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M2 2l8 8M10 2l-8 8" />
    </Svg>
  );
}

export function IconPlus({ size = 13, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M6.5 2v9M2 6.5h9" />
    </Svg>
  );
}

export function IconChevronLeft({ size = 18, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M11 4L6 9l5 5" />
    </Svg>
  );
}

export function IconBell({ size = 15, color = colors.mutedHi }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M7.5 2a4.5 4.5 0 014.5 4.5c0 3 1 4 1 4h-11s1-1 1-4A4.5 4.5 0 017.5 2zM5.5 10.5a2 2 0 004 0" />
    </Svg>
  );
}

export function IconScreening({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={1.6}>
      <Circle cx="10" cy="10" r="7" />
      <Path d="M7 10l2 2 4-4" />
    </Svg>
  );
}

export function IconMore({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
      <Circle cx="4" cy="10" r="1.5" />
      <Circle cx="10" cy="10" r="1.5" />
      <Circle cx="16" cy="10" r="1.5" />
    </Svg>
  );
}
