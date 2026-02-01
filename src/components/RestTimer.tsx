import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

// ============================================
// Haptic feedback helper (safe import)
// ============================================
let triggerHaptic: (() => void) | null = null;
try {
  const Haptics = require('expo-haptics');
  triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available on this device
    }
  };
} catch {
  // expo-haptics not installed
}

// ============================================
// Props
// ============================================
interface RestTimerProps {
  onTimeLogged?: (seconds: number) => void;
  isCompact?: boolean;
}

// ============================================
// Component
// ============================================
export default function RestTimer({
  onTimeLogged,
  isCompact = false,
}: RestTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    if (isRunning) return;

    triggerHaptic?.();
    setIsRunning(true);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const currentElapsed = Math.floor(
        (now - startTimeRef.current) / 1000
      );
      setElapsedSeconds(accumulatedRef.current + currentElapsed);
    }, 200);
  }, [isRunning]);

  const stopTimer = useCallback(() => {
    if (!isRunning) return;

    triggerHaptic?.();
    setIsRunning(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const finalElapsed =
      accumulatedRef.current +
      Math.floor((Date.now() - startTimeRef.current) / 1000);
    accumulatedRef.current = finalElapsed;
    setElapsedSeconds(finalElapsed);

    if (finalElapsed > 0) {
      onTimeLogged?.(finalElapsed);
    }
  }, [isRunning, onTimeLogged]);

  const resetTimer = useCallback(() => {
    triggerHaptic?.();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsRunning(false);
    setElapsedSeconds(0);
    accumulatedRef.current = 0;
    startTimeRef.current = 0;
  }, []);

  // Format seconds into MM:SS
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const timerColor = isRunning ? '#34C759' : '#8E8E93';

  // ---- Compact Layout ----
  if (isCompact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactDot, { backgroundColor: timerColor }]} />
        <Text style={[styles.compactTime, { color: timerColor }]}>
          {formatTime(elapsedSeconds)}
        </Text>

        {!isRunning ? (
          <TouchableOpacity
            style={[styles.compactButton, styles.compactStartButton]}
            onPress={elapsedSeconds > 0 ? resetTimer : startTimer}
          >
            <Text style={styles.compactButtonText}>
              {elapsedSeconds > 0 ? 'Reset' : 'Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.compactButton, styles.compactStopButton]}
            onPress={stopTimer}
          >
            <Text style={styles.compactButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ---- Full Layout ----
  return (
    <View style={styles.container}>
      {/* Circular Timer Display */}
      <View style={[styles.timerCircle, { borderColor: timerColor }]}>
        <Text style={styles.timerLabel}>REST</Text>
        <Text style={[styles.timerText, { color: timerColor }]}>
          {formatTime(elapsedSeconds)}
        </Text>
        {isRunning && (
          <View style={[styles.runningIndicator, { backgroundColor: timerColor }]} />
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonRow}>
        {!isRunning ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startTimer}
              accessibilityLabel="Start rest timer"
            >
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>

            {elapsedSeconds > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={resetTimer}
                accessibilityLabel="Reset rest timer"
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopTimer}
            accessibilityLabel="Stop rest timer"
          >
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  // ---- Full Layout ----
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  timerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  runningIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 110,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#2C2C2E',
  },
  resetButtonText: {
    color: '#8E8E93',
    fontSize: 17,
    fontWeight: '600',
  },

  // ---- Compact Layout ----
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 10,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactTime: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flex: 1,
  },
  compactButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  compactStartButton: {
    backgroundColor: '#34C759',
  },
  compactStopButton: {
    backgroundColor: '#FF3B30',
  },
  compactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
