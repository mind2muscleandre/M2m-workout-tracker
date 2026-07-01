import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { coachColors, borderRadius, fonts } from '../../lib/theme';

export interface ChatMessage {
  id: string;
  dir: 'in' | 'out';
  text: string;
  time: string;
}

interface ChatThreadProps {
  messages: ChatMessage[];
  onSend?: (text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function ChatThread({
  messages,
  onSend,
  placeholder = 'Skriv meddelande…',
  readOnly = false,
}: ChatThreadProps) {
  const [text, setText] = React.useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !onSend) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.thread}>
        {messages.map((m) => (
          <View key={m.id} style={m.dir === 'out' ? styles.outWrap : styles.inWrap}>
            <View style={[styles.bubble, m.dir === 'out' ? styles.bubbleOut : styles.bubbleIn]}>
              <Text style={styles.bubbleText}>{m.text}</Text>
            </View>
            <Text style={[styles.time, m.dir === 'in' && styles.timeIn]}>{m.time}</Text>
          </View>
        ))}
      </View>
      {!readOnly && onSend ? (
        <View style={styles.compose}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={coachColors.muted}
            multiline
          />
          <TouchableOpacity style={styles.send} onPress={handleSend} activeOpacity={0.75}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  thread: { gap: 8 },
  outWrap: { alignSelf: 'flex-end', maxWidth: '90%' },
  inWrap: { alignSelf: 'flex-start', maxWidth: '90%' },
  bubble: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: borderRadius.md,
  },
  bubbleOut: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.18)',
    borderBottomRightRadius: 4,
  },
  bubbleIn: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: coachColors.fg,
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    marginTop: 3,
    textAlign: 'right',
  },
  timeIn: { textAlign: 'left' },
  compose: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 90,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.fg,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.coach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
