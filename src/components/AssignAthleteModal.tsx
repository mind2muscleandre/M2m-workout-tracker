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
import type { AthleteProfile } from '../types/athlete';
import { colors, coachColors, fonts, borderRadius } from '../lib/theme';

export interface AssignAthleteModalProps {
  visible: boolean;
  onClose: () => void;
  onAssign: (athlete: AthleteProfile) => void;
  isAssigning: boolean;
  fetchAthletes: (query: string) => Promise<AthleteProfile[]>;
  title?: string;
}

export function AssignAthleteModal({
  visible,
  onClose,
  onAssign,
  isAssigning,
  fetchAthletes,
  title = 'Tilldela atlet',
}: AssignAthleteModalProps) {
  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      fetchAthletes(query)
        .then((rows) => {
          if (!cancelled) setAthletes(rows);
        })
        .catch((e) => {
          if (!cancelled) {
            setAthletes([]);
            setLoadError(e instanceof Error ? e.message : 'Kunde inte hämta atleter');
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
  }, [visible, query, fetchAthletes]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setAthletes([]);
      setLoadError(null);
    }
  }, [visible]);

  const renderAthlete = useCallback(
    ({ item }: { item: AthleteProfile }) => (
      <TouchableOpacity
        style={styles.assignRow}
        onPress={() => onAssign(item)}
        disabled={isAssigning}
        activeOpacity={0.75}
      >
        <View style={styles.assignRowText}>
          <Text style={styles.assignName}>{item.name}</Text>
          <Text style={styles.assignMeta}>{item.email || 'Ingen e-post'}</Text>
          {item.team ? <Text style={styles.assignTeam}>{item.team}</Text> : null}
        </View>
        <Text style={styles.chevron}>{'\u203A'}</Text>
      </TouchableOpacity>
    ),
    [onAssign, isAssigning]
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
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>{'\u{1F50D}'}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Sök namn, e-post eller lag..."
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
            data={athletes}
            renderItem={renderAthlete}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={
              athletes.length === 0 ? styles.listContentEmpty : styles.assignListContent
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Inga atleter att tilldela</Text>
                <Text style={styles.emptySubtitle}>
                  Alla kan redan vara dina klienter, eller så matchar inget din sökning.
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {isAssigning ? (
          <View style={styles.assignOverlay}>
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
  modalHeaderSpacer: {
    minWidth: 60,
  },
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
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
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
    gap: 12,
  },
  assignListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  assignRowText: {
    flex: 1,
    marginRight: 8,
  },
  assignName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  assignMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assignTeam: {
    fontSize: 13,
    color: colors.primaryLight,
    marginTop: 2,
  },
  assignOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
