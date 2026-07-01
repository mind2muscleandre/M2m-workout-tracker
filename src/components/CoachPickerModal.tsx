import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import type { TrainerProfile } from '../services/platformUsers';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';

interface CoachPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (trainer: TrainerProfile) => void;
  isSelecting: boolean;
  fetchTrainers: (query: string) => Promise<TrainerProfile[]>;
}

export function CoachPickerModal({
  visible,
  onClose,
  onSelect,
  isSelecting,
  fetchTrainers,
}: CoachPickerModalProps) {
  const [query, setQuery] = useState('');
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      fetchTrainers(query)
        .then((rows) => {
          if (!cancelled) setTrainers(rows);
        })
        .catch((e) => {
          if (!cancelled) {
            setTrainers([]);
            setLoadError(e instanceof Error ? e.message : 'Kunde inte hämta tränare');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, query, fetchTrainers]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setTrainers([]);
      setLoadError(null);
    }
  }, [visible]);

  const renderTrainer = useCallback(
    ({ item }: { item: TrainerProfile }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelect(item)}
        disabled={isSelecting}
        activeOpacity={0.75}
      >
        <View style={styles.rowText}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>{item.email || 'Ingen e-post'}</Text>
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>
    ),
    [onSelect, isSelecting]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.modalCancelText}>Stäng</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Välj tränare</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Sök tränare..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptySubtitle}>{loadError}</Text>
          </View>
        ) : (
          <FlatList
            data={trainers}
            renderItem={renderTrainer}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={
              trainers.length === 0 ? styles.listContentEmpty : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Inga tränare hittades</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {isSelecting ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: coachColors.screenBg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: coachColors.border,
  },
  modalHeaderSpacer: { minWidth: 60 },
  modalCancelText: {
    fontSize: 15,
    color: coachColors.muted,
    fontFamily: fonts.bodyMedium,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: coachColors.fg,
    fontFamily: fonts.display,
  },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 0 },
  chevron: { fontSize: 24, color: colors.textSecondary, fontWeight: '300' },
  listContentEmpty: { flexGrow: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 10 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowText: { flex: 1, marginRight: 8 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  meta: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
