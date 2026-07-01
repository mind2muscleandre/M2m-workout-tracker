import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';
import { IconSearch } from './icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: object;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Sök…',
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.bar, style]}>
      <IconSearch />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={coachColors.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    height: 36,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.fg,
    paddingVertical: 0,
  },
  clear: {
    fontSize: 12,
    color: coachColors.muted,
  },
});
