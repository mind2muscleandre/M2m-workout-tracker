import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { useClientStore } from '../stores/clientStore';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { Button } from '../components/ui/Button';
import { SplitPane } from '../components/ui/SplitPane';
import { coachColors, fonts, borderRadius, spacing } from '../lib/theme';

export function NotesScreen() {
  const { notes, activeNote, fetchNotes, selectNote, saveNote, removeNote } = useNotesStore();
  const { clients, fetchClients } = useClientStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchNotes().catch(() => {});
    fetchClients().catch(() => {});
  }, [fetchNotes, fetchClients]);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setBody(activeNote.body);
      setClientId(activeNote.client_id);
    }
  }, [activeNote]);

  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!title.trim() && !body.trim()) return;
      try {
        const note = await saveNote({
          id: activeNote?.id,
          title: title.trim() || 'Utan titel',
          body,
          client_id: clientId,
        });
        setSavedAt(
          new Date(note.updated_at).toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      } catch {
        // tables may not exist yet
      }
    }, 800);
  }, [activeNote?.id, body, clientId, saveNote, title]);

  useEffect(() => {
    if (activeNote || title || body) scheduleSave();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, body, clientId, scheduleSave, activeNote]);

  const onNew = () => {
    selectNote(null);
    setTitle('');
    setBody('');
    setClientId(null);
    setSavedAt(null);
  };

  const onDelete = () => {
    if (!activeNote) return;
    Alert.alert('Radera anteckning?', activeNote.title, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Radera',
        style: 'destructive',
        onPress: () => removeNote(activeNote.id),
      },
    ]);
  };

  const selectedClientName =
    clientId === null
      ? 'Trupp'
      : clients.find((c) => c.id === clientId)?.name ?? 'Atlet';

  const noteList = (
    <View style={styles.list}>
      <View style={styles.listHeader}>
        <Text style={styles.listCount}>{`${notes.length} anteckningar`}</Text>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Text style={styles.filterIcon}>≡</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        style={styles.notesScroll}
        renderItem={({ item }) => {
          const isActive = activeNote?.id === item.id;
          const athleteName = item.client?.name ?? 'Trupp';
          const athleteColor =
            athleteName === 'Trupp'
              ? coachColors.muted
              : coachColors.coach;

          return (
            <TouchableOpacity
              style={[styles.noteItem, isActive && styles.noteItemActive]}
              onPress={() => selectNote(item)}
            >
              {isActive ? <View style={styles.noteActiveBar} /> : null}
              <Text style={[styles.noteAthlete, { color: athleteColor }]}>{athleteName}</Text>
              <Text style={styles.noteTitle} numberOfLines={1}>
                {item.title || 'Utan titel'}
              </Text>
              <Text style={styles.notePreview} numberOfLines={1}>
                {item.body}
              </Text>
              <Text style={styles.noteDate}>
                {new Date(item.updated_at).toLocaleDateString('sv-SE')}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const editor = (
    <View style={styles.editor}>
      <View style={styles.editorHeader}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Titel…"
          placeholderTextColor={coachColors.muted}
        />
        <View style={styles.tagRow}>
          <View style={styles.tagChip}>
            <Text style={styles.tagChipText}>{selectedClientName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.tagChip, !clientId && styles.tagChipActive]}
            onPress={() => setClientId(null)}
          >
            <Text style={styles.tagChipText}>Trupp</Text>
          </TouchableOpacity>
          {clients
            .filter((c) => c.is_active)
            .slice(0, 4)
            .map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.tagChip, clientId === c.id && styles.tagChipActive]}
                onPress={() => setClientId(c.id)}
              >
                <Text style={styles.tagChipText}>{c.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
          {activeNote ? (
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <TextInput
        style={styles.bodyInput}
        value={body}
        onChangeText={setBody}
        placeholder="Börja skriva…"
        placeholderTextColor={coachColors.muted}
        multiline
        textAlignVertical="top"
      />
      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {savedAt ? `Sparat automatiskt · ${savedAt}` : 'Autospar aktiv'}
        </Text>
        <Text style={styles.footerMeta}>Ord: {wordCount}</Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer
      title="Anteckningar"
      headerRight={
        <Button label="Ny anteckning" variant="primary" size="sm" onPress={onNew} />
      }
      scroll={false}
    >
      <SplitPane list={noteList} detail={editor} listWidth={280} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  listCount: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: coachColors.muted,
    marginBottom: 0,
  },
  filterBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  filterIcon: {
    fontSize: 11,
    color: coachColors.mutedHi,
  },
  notesScroll: { flex: 1 },
  noteItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
    position: 'relative',
  },
  noteItemActive: {
    backgroundColor: coachColors.glassBgCoach,
  },
  noteActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: coachColors.coach,
  },
  noteAthlete: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.63,
    color: coachColors.coach,
    marginBottom: 3,
  },
  noteTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.fg,
    marginBottom: 3,
  },
  notePreview: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: coachColors.muted,
  },
  noteDate: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: coachColors.muted,
    marginTop: 5,
  },
  editor: { flex: 1, minWidth: 0 },
  editorHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  titleInput: {
    flex: 1,
    minWidth: 160,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: coachColors.fg,
    padding: 0,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tagChip: {
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  tagChipActive: {
    borderColor: coachColors.coachHi,
    backgroundColor: coachColors.coachDim,
  },
  tagChipText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.mutedHi,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    marginLeft: spacing.xs,
  },
  delete: { color: coachColors.mutedHi, fontSize: 12, fontWeight: '600' },
  bodyInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontFamily: fonts.body,
    fontSize: 14,
    color: coachColors.fg,
    lineHeight: 23,
    minHeight: 200,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: coachColors.border,
  },
  footerMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
  },
});
