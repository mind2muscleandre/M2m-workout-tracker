import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { coachColors, fonts } from '../lib/theme';
import { formatTime } from '../utils/helpers';

const PRESETS = [60, 90, 120, 180];

type Props = {
  defaultSeconds?: number;
};

/** Countdown rest timer for SessionTimer (coach session view). */
export function CountdownRestTimer({ defaultSeconds = 90 }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = (secs: number) => {
    setRunning(false);
    setSecondsLeft(secs);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Vilotimer</Text>
      <Text style={styles.time}>{formatTime(secondsLeft)}</Text>
      <View style={styles.presets}>
        {PRESETS.map((p) => (
          <TouchableOpacity key={p} style={styles.presetBtn} onPress={() => reset(p)}>
            <Text style={styles.presetText}>{p}s</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.primary]}
          onPress={() => {
            if (secondsLeft === 0) setSecondsLeft(defaultSeconds);
            setRunning((r) => !r);
          }}
        >
          <Text style={styles.btnTextPrimary}>{running ? 'Pausa' : 'Starta'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => reset(defaultSeconds)}>
          <Text style={styles.btnText}>Återställ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  time: {
    fontFamily: fonts.display,
    fontSize: 40,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 12,
  },
  presets: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  presetText: { fontFamily: fonts.mono, fontSize: 11, color: coachColors.mutedHi },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: coachColors.border,
  },
  primary: { backgroundColor: coachColors.coach, borderColor: coachColors.coach },
  btnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: coachColors.fg },
  btnTextPrimary: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#000' },
});
