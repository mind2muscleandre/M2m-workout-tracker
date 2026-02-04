import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import WheelPicker from './WheelPicker';

// ============================================
// Props
// ============================================
interface SetLoggerProps {
  setNumber: number;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  previousWeight?: number;
  previousReps?: number;
  onWeightChange: (val: number) => void;
  onRepsChange: (val: number) => void;
  onRpeChange?: (val: number) => void;
  onDelete?: () => void;
  isPR?: boolean;
}

// Generate weight values: 0 to 300 kg in 2.5 kg increments
const WEIGHT_VALUES = Array.from({ length: 121 }, (_, i) => i * 2.5);

// Generate reps values: 0 to 100
const REPS_VALUES = Array.from({ length: 101 }, (_, i) => i);

// ============================================
// Component
// ============================================
export default function SetLogger({
  setNumber,
  weightKg,
  reps,
  rpe,
  previousWeight,
  previousReps,
  onWeightChange,
  onRepsChange,
  onRpeChange,
  onDelete,
  isPR = false,
}: SetLoggerProps) {
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showRepsPicker, setShowRepsPicker] = useState(false);

  const handleRpeText = (text: string) => {
    const parsed = parseFloat(text);
    onRpeChange?.(isNaN(parsed) ? 0 : parsed);
  };

  const incrementWeight = () => onWeightChange((weightKg ?? 0) + 2.5);
  const decrementWeight = () => onWeightChange(Math.max(0, (weightKg ?? 0) - 2.5));
  const incrementReps = () => onRepsChange((reps ?? 0) + 1);
  const decrementReps = () => onRepsChange(Math.max(0, (reps ?? 0) - 1));

  return (
    <View style={styles.container}>
      {/* Main Row */}
      <View style={styles.mainRow}>
        {/* Set Number */}
        <View style={styles.setNumberContainer}>
          <Text style={styles.setNumber}>{setNumber}</Text>
          {isPR && <Text style={styles.prIcon}>{'\uD83C\uDFC6'}</Text>}
        </View>

        {/* Weight Input with +/- */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.incrementButton}
            onPress={decrementWeight}
            accessibilityLabel="Decrease weight"
          >
            <Text style={styles.incrementText}>-</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setShowWeightPicker(true)}
            accessibilityLabel={`Weight for set ${setNumber}`}
          >
            <View style={styles.pickerButton}>
              <Text style={[
                styles.pickerButtonText,
                (!weightKg || weightKg === 0) && styles.placeholderText
              ]}>
                {weightKg != null && weightKg > 0 
                  ? weightKg.toFixed(weightKg % 1 === 0 ? 0 : 1) 
                  : '0'}
              </Text>
            </View>
            <Text style={styles.unitLabel}>kg</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.incrementButton}
            onPress={incrementWeight}
            accessibilityLabel="Increase weight"
          >
            <Text style={styles.incrementText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Reps Input with +/- */}
        <View style={styles.inputGroup}>
          <TouchableOpacity
            style={styles.incrementButton}
            onPress={decrementReps}
            accessibilityLabel="Decrease reps"
          >
            <Text style={styles.incrementText}>-</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setShowRepsPicker(true)}
            accessibilityLabel={`Reps for set ${setNumber}`}
          >
            <View style={styles.pickerButton}>
              <Text style={[
                styles.pickerButtonText,
                (!reps || reps === 0) && styles.placeholderText
              ]}>
                {reps != null && reps > 0 ? String(reps) : '0'}
              </Text>
            </View>
            <Text style={styles.unitLabel}>reps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.incrementButton}
            onPress={incrementReps}
            accessibilityLabel="Increase reps"
          >
            <Text style={styles.incrementText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* RPE Input (compact) */}
        {onRpeChange && (
          <View style={styles.rpeWrapper}>
            <TextInput
              style={styles.rpeInput}
              value={rpe != null && rpe > 0 ? String(rpe) : ''}
              onChangeText={handleRpeText}
              keyboardType="decimal-pad"
              placeholder="-"
              placeholderTextColor="#3A3A3C"
              maxLength={4}
              accessibilityLabel={`RPE for set ${setNumber}`}
            />
            <Text style={styles.rpeLabel}>RPE</Text>
          </View>
        )}

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Delete set ${setNumber}`}
          >
            <Text style={styles.deleteIcon}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Previous Set Reference */}
      {(previousWeight != null || previousReps != null) && (
        <View style={styles.previousRow}>
          <Text style={styles.previousLabel}>Previous:</Text>
          {previousWeight != null && (
            <Text style={styles.previousValue}>{previousWeight}kg</Text>
          )}
          {previousWeight != null && previousReps != null && (
            <Text style={styles.previousSeparator}>{'\u00D7'}</Text>
          )}
          {previousReps != null && (
            <Text style={styles.previousValue}>{previousReps} reps</Text>
          )}
        </View>
      )}

      {/* Weight Picker Modal */}
      <WheelPicker
        visible={showWeightPicker}
        onClose={() => setShowWeightPicker(false)}
        onSelect={onWeightChange}
        currentValue={weightKg ?? 0}
        values={WEIGHT_VALUES}
        unit="kg"
        title="Välj vikt"
      />

      {/* Reps Picker Modal */}
      <WheelPicker
        visible={showRepsPicker}
        onClose={() => setShowRepsPicker(false)}
        onSelect={onRepsChange}
        currentValue={reps ?? 0}
        values={REPS_VALUES}
        unit="reps"
        title="Välj repetitioner"
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumberContainer: {
    width: 32,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F7E928',
  },
  prIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  incrementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBF47A',
  },
  inputWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: '100%',
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  pickerButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#3A3A3C',
  },
  unitLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '500',
  },
  rpeWrapper: {
    alignItems: 'center',
    width: 44,
  },
  rpeInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    textAlign: 'center',
    width: 44,
  },
  rpeLabel: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  previousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 40,
    gap: 4,
  },
  previousLabel: {
    fontSize: 11,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  previousValue: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  previousSeparator: {
    fontSize: 11,
    color: '#3A3A3C',
  },
});
