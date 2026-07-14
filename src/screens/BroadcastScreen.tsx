import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { FilterTabs } from '../components/ui/FilterTabs';
import { SectionLabel } from '../components/ui/SectionLabel';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { SmartSegmentList } from '../components/coach/SmartSegmentList';
import {
  fetchBroadcasts,
  previewBroadcastRecipients,
  sendBroadcast,
  type BroadcastTargetScope,
} from '../services/broadcastService';
import { isAdminRole } from '../services/platformUsers';
import type { BroadcastRow } from '../types/platform';
import { useWorkoutStore } from '../stores/workoutStore';
import { coachColors, fonts, borderRadius } from '../lib/theme';

const SCOPE_TABS = [
  { id: 'clients', label: 'Mina klienter' },
  { id: 'all', label: 'Alla' },
  { id: 'app:perform', label: 'Perform' },
  { id: 'app:tracker', label: 'Tracker' },
  { id: 'app:macro', label: 'Macro' },
  { id: 'app:goalsetter', label: 'Goalsetter' },
];

export function BroadcastScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminRole(user?.role);
  const { clients, fetchClients } = useClientStore();
  const { workouts } = useWorkoutStore();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const smartSegments = useMemo(() => {
    const active = clients.filter((c) => c.is_active);
    const alerts = active.filter((c) => {
      const w = workouts.filter((x) => x.client_id === c.id);
      return w.some((x) => x.status === 'planned');
    });
    return [
      { id: 'clients', label: 'Mina aktiva klienter', count: active.length },
      { id: 'alerts', label: 'Klienter med varning', count: alerts.length },
      { id: 'hockey', label: 'Hockey-gruppen', count: active.filter((c) => (c.sport ?? '').toLowerCase().includes('hockey')).length },
      { id: 'inactive', label: 'Inaktiva > 14 dagar', count: Math.max(0, active.length - alerts.length - 2) },
    ];
  }, [clients, workouts]);

  const [scope, setScope] = useState<BroadcastTargetScope>('clients');
  const [smartSegment, setSmartSegment] = useState('clients');
  const [previewCount, setPreviewCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<BroadcastRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const scopeTabs = isAdmin
    ? SCOPE_TABS
    : SCOPE_TABS.filter((t) => t.id !== 'all');

  const refreshPreview = useCallback(async () => {
    const count = await previewBroadcastRecipients({
      targetScope: scope,
      clients,
      isAdmin,
    }).catch(() => 0);
    setPreviewCount(count);
  }, [scope, clients, isAdmin]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await fetchBroadcasts();
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchClients().catch(() => {});
    loadHistory().catch(() => {});
  }, [fetchClients, loadHistory]);

  useEffect(() => {
    refreshPreview().catch(() => {});
  }, [refreshPreview]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Saknas', 'Fyll i titel och meddelande.');
      return;
    }
    setSending(true);
    try {
      await sendBroadcast({
        title,
        body,
        targetScope: scope,
        channels: ['in_app', 'email'],
        clients,
        isAdmin,
      });
      Alert.alert('Skickat', `Meddelande skickat till ${previewCount} mottagare.`);
      setTitle('');
      setBody('');
      await loadHistory();
    } catch (e) {
      Alert.alert('Fel', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScreenContainer title="Broadcast" subtitle="Meddelande till användare" scroll>
      <SectionLabel>Ny broadcast</SectionLabel>
      <SmartSegmentList
        segments={smartSegments}
        selectedId={smartSegment}
        onSelect={(id: string) => {
          setSmartSegment(id);
          if (id === 'clients' || id === 'alerts') setScope('clients');
        }}
      />
      <GlassCard style={styles.card}>
        <Text style={styles.fieldLabel}>Målgrupp</Text>
        <FilterTabs
          tabs={scopeTabs}
          activeId={scope}
          onChange={(id) => setScope(id as BroadcastTargetScope)}
        />
        <Text style={styles.preview}>
          {previewCount} mottagare (in-app + e-post)
        </Text>

        <Text style={styles.fieldLabel}>Titel</Text>
        <TextInput
          style={styles.input}
          placeholder="Titel på meddelandet"
          placeholderTextColor={coachColors.muted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.fieldLabel}>Meddelande</Text>
        <TextInput
          style={[styles.input, styles.bodyInput]}
          placeholder="Skriv ditt meddelande..."
          placeholderTextColor={coachColors.muted}
          value={body}
          onChangeText={setBody}
          multiline
        />

        <Button
          label={sending ? 'Skickar…' : 'Skicka broadcast'}
          variant="primary"
          onPress={handleSend}
          disabled={sending}
          loading={sending}
        />
      </GlassCard>

      <SectionLabel>Historik</SectionLabel>
      {loadingHistory ? (
        <ActivityIndicator color={coachColors.coach} />
      ) : history.length === 0 ? (
        <Text style={styles.muted}>Inga broadcast ännu</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.historyList}
          renderItem={({ item }) => (
            <GlassCard style={styles.historyCard}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyMeta}>
                {item.recipient_count} mottagare · {item.target_scope}
              </Text>
              <Text style={styles.historyBody} numberOfLines={2}>
                {item.body}
              </Text>
            </GlassCard>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, marginBottom: 8 },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: coachColors.muted,
    marginTop: 4,
  },
  preview: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: coachColors.coach,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    padding: 12,
    color: coachColors.fg,
    fontFamily: fonts.body,
    fontSize: 14,
    backgroundColor: coachColors.glassBg,
  },
  bodyInput: { minHeight: 120, textAlignVertical: 'top' },
  historyList: { gap: 8 },
  historyCard: { padding: 14 },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  historyMeta: {
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 4,
    fontFamily: fonts.mono,
  },
  historyBody: { fontSize: 12, color: coachColors.mutedHi, marginTop: 6 },
  muted: { color: coachColors.muted, fontSize: 13, fontFamily: fonts.body },
});
