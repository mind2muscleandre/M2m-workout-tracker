// ============================================
// Välj klient för rörelsebedömning
// ============================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { Client } from '../types/database';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { StepIndicator } from '../components/ui/StepIndicator';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { listMovementAssessmentsForClient } from '../services/clientAssessments';
import { getClientAvatarColor, getClientInitials } from '../lib/athleteStatus';
import { coachColors, fonts, borderRadius } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessmentClientPick'>;

type AssessmentBadge = 'overdue' | 'ok' | 'new' | 'no-email';

const STEP_LABELS = ['Välj atlet', 'Bedömning', 'Program', 'Resultat'];

function isPlausibleEmail(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (t.length < 5) return false;
  const at = t.indexOf('@');
  if (at <= 0 || at === t.length - 1) return false;
  return t.includes('.', at);
}

function weeksSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 7);
}

function badgeForClient(
  hasEmail: boolean,
  lastAssessmentDate: string | null
): { badge: AssessmentBadge; label: string; lastText: string } {
  if (!hasEmail) {
    return { badge: 'no-email', label: 'Saknar e-post', lastText: 'Lägg till e-post först' };
  }
  if (!lastAssessmentDate) {
    return { badge: 'new', label: 'Ny', lastText: 'Aldrig bedömd' };
  }
  const weeks = weeksSince(lastAssessmentDate);
  if (weeks > 12) {
    return {
      badge: 'overdue',
      label: 'Överskriden',
      lastText: `Senaste bedömning: ${Math.round(weeks)} veckor sedan`,
    };
  }
  return {
    badge: 'ok',
    label: 'Aktuell',
    lastText: `Senaste bedömning: ${lastAssessmentDate}`,
  };
}

const badgeStyles: Record<
  AssessmentBadge,
  { bg: string; border: string; text: string }
> = {
  overdue: {
    bg: coachColors.orangeDim,
    border: 'rgba(255,95,31,0.22)',
    text: coachColors.orange,
  },
  ok: {
    bg: coachColors.coachDim,
    border: 'rgba(0,212,170,0.22)',
    text: coachColors.coach,
  },
  new: {
    bg: 'rgba(255,255,255,0.07)',
    border: coachColors.border,
    text: coachColors.muted,
  },
  'no-email': {
    bg: 'rgba(255,255,255,0.07)',
    border: coachColors.border,
    text: coachColors.muted,
  },
};

export function MovementAssessmentClientPickScreen({ navigation }: Props) {
  const clients = useClientStore((s) => s.clients);
  const addClient = useClientStore((s) => s.addClient);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastAssessmentByClient, setLastAssessmentByClient] = useState<Record<string, string>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  const activeClients = useMemo(
    () =>
      clients
        .filter((c) => c.is_active)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    [clients]
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeClients;
    return activeClients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.sport ?? '').toLowerCase().includes(q)
    );
  }, [activeClients, search]);

  const selectedClient = useMemo(
    () => activeClients.find((c) => c.id === selectedId) ?? null,
    [activeClients, selectedId]
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoadingMeta(true);
      const map: Record<string, string> = {};
      await Promise.all(
        activeClients.slice(0, 30).map(async (client) => {
          const rows = await listMovementAssessmentsForClient(client.id, 1).catch(() => []);
          if (rows[0]) {
            map[client.id] = rows[0].assessment_date || rows[0].created_at.slice(0, 10);
          }
        })
      );
      if (alive) {
        setLastAssessmentByClient(map);
        setLoadingMeta(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [activeClients]);

  const continueToAssessment = useCallback(
    (client: Client) => {
      if (!client.email?.trim()) {
        Alert.alert(
          'E-post saknas',
          'Lägg till e-post på klienten under klientdetaljer innan rörelsebedömning kan skickas till screening.'
        );
        return;
      }
      navigation.navigate('MovementAssessment', { clientId: client.id });
    },
    [navigation]
  );

  const handleContinue = useCallback(() => {
    if (!selectedClient) return;
    continueToAssessment(selectedClient);
  }, [continueToAssessment, selectedClient]);

  const handleCreateAndContinue = useCallback(async () => {
    const name = newName.trim();
    const email = newEmail.trim().toLowerCase();
    if (!user?.id) {
      Alert.alert('Fel', 'Du måste vara inloggad.');
      return;
    }
    if (!name) {
      Alert.alert('Saknar namn', 'Ange klientens namn.');
      return;
    }
    if (!isPlausibleEmail(email)) {
      Alert.alert('Ogiltig e-post', 'Ange en giltig e-postadress (används till screening).');
      return;
    }
    setCreating(true);
    try {
      const created = await addClient({
        assigned_pt_id: user.id,
        client_user_id: null,
        name,
        email,
        phone: null,
        notes: null,
        sport: null,
        age: null,
        weight_kg: null,
        is_active: true,
      });
      setNewName('');
      setNewEmail('');
      setShowNewClient(false);
      navigation.navigate('MovementAssessment', { clientId: created.id });
    } catch {
      Alert.alert('Kunde inte spara', 'Något gick fel. Försök igen.');
    } finally {
      setCreating(false);
    }
  }, [addClient, navigation, newEmail, newName, user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: Client }) => {
      const hasEmail = Boolean(item.email?.trim());
      const lastDate = lastAssessmentByClient[item.id] ?? null;
      const meta = badgeForClient(hasEmail, lastDate);
      const badgeStyle = badgeStyles[meta.badge];
      const avatarColor = getClientAvatarColor(item.id);
      const selected = selectedId === item.id;

      return (
        <TouchableOpacity
          style={[styles.athRow, selected && styles.athRowSelected, !hasEmail && styles.rowDisabled]}
          onPress={() => setSelectedId(item.id)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${item.name}${hasEmail ? '' : ', saknar e-post'}`}
        >
          <LinearGradient
            colors={[avatarColor, `${avatarColor}4D`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.athAvatar}
          >
            <Text style={styles.athInitials}>{getClientInitials(item.name)}</Text>
          </LinearGradient>
          <View style={styles.athInfo}>
            <Text style={styles.athName}>{item.name}</Text>
            {item.sport ? <Text style={styles.athSport}>{item.sport}</Text> : null}
            <Text style={styles.athLast}>{meta.lastText}</Text>
          </View>
          <View
            style={[
              styles.athBadge,
              { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
            ]}
          >
            <Text style={[styles.athBadgeText, { color: badgeStyle.text }]}>{meta.label}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [lastAssessmentByClient, selectedId]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <StepIndicator current={1} labels={STEP_LABELS} />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Sök atlet…"
          style={styles.search}
        />
        <TouchableOpacity onPress={() => setShowNewClient((v) => !v)} style={styles.newToggle}>
          <Text style={styles.newToggleText}>
            {showNewClient ? 'Dölj ny klient' : '+ Skapa ny klient'}
          </Text>
        </TouchableOpacity>
        {showNewClient ? (
          <GlassCard padding={16} style={styles.newClientCard}>
            <SectionLabel>Ny klient</SectionLabel>
            <Text style={styles.newClientHint}>
              Saknas personen i listan? Skapa med namn och e-post och gå vidare till bedömningen.
            </Text>
            <Text style={styles.inputLabel}>Namn</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="För- och efternamn"
              placeholderTextColor={coachColors.muted}
              autoCapitalize="words"
              editable={!creating}
            />
            <Text style={styles.inputLabel}>E-post</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="namn@exempel.se"
              placeholderTextColor={coachColors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!creating}
            />
            <Button
              label="Skapa klient och fortsätt"
              variant="primary"
              onPress={handleCreateAndContinue}
              loading={creating}
              disabled={creating}
            />
          </GlassCard>
        ) : null}
        <SectionLabel>Dina atleter</SectionLabel>
        {loadingMeta ? <ActivityIndicator color={coachColors.coach} style={styles.metaLoader} /> : null}
      </View>
    ),
    [creating, handleCreateAndContinue, loadingMeta, newEmail, newName, search, showNewClient]
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyInline}>
        <Text style={styles.emptyText}>
          Inga atleter matchar sökningen. Skapa en ny klient eller lägg till fler under Klienter.
        </Text>
      </View>
    ),
    []
  );

  return (
    <ScreenContainer
      title="Välj atlet"
      scroll={false}
      headerLeft={
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>Tillbaka</Text>
        </TouchableOpacity>
      }
    >
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.continueBar}>
        <LinearGradient
          colors={['transparent', coachColors.screenBg]}
          style={styles.continueFade}
          pointerEvents="none"
        />
        <Button
          label="Fortsätt →"
          variant="primary"
          onPress={handleContinue}
          disabled={!selectedClient || !selectedClient.email?.trim()}
          style={styles.continueBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { color: coachColors.coach, fontSize: 16, fontFamily: fonts.bodyMedium },
  headerBlock: { marginBottom: 8 },
  search: { maxWidth: '100%', marginBottom: 14 },
  newToggle: { marginBottom: 12 },
  newToggleText: {
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  newClientCard: { marginBottom: 16 },
  newClientHint: {
    color: coachColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  inputLabel: {
    color: coachColors.muted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
    fontFamily: fonts.body,
  },
  input: {
    height: 40,
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    color: coachColors.fg,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  metaLoader: { marginBottom: 8 },
  list: { padding: 16, paddingBottom: 100 },
  athRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  athRowSelected: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.30)',
  },
  rowDisabled: { opacity: 0.75 },
  athAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athInitials: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  athInfo: { flex: 1, minWidth: 0 },
  athName: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  athSport: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.muted,
    marginTop: 2,
  },
  athLast: {
    fontSize: 11,
    color: coachColors.muted,
    marginTop: 5,
    fontFamily: fonts.body,
  },
  athBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  athBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sep: { height: 8 },
  emptyInline: { paddingVertical: 8 },
  emptyText: {
    color: coachColors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.body,
  },
  continueBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: coachColors.border,
    backgroundColor: coachColors.screenBg,
    position: 'relative',
  },
  continueFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -24,
    height: 24,
  },
  continueBtn: { height: 48 },
});

export default MovementAssessmentClientPickScreen;
