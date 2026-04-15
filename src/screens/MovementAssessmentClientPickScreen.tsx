// ============================================
// Välj klient för rörelsebedömning
// ============================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { useClientStore } from '../stores/clientStore';
import { useAuthStore } from '../stores/authStore';
import { Client } from '../types/database';

type Props = StackScreenProps<RootStackParamList, 'MovementAssessmentClientPick'>;

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#F7E928',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
};

function isPlausibleEmail(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (t.length < 5) return false;
  const at = t.indexOf('@');
  if (at <= 0 || at === t.length - 1) return false;
  return t.includes('.', at);
}

export function MovementAssessmentClientPickScreen({ navigation }: Props) {
  const clients = useClientStore((s) => s.clients);
  const addClient = useClientStore((s) => s.addClient);
  const user = useAuthStore((s) => s.user);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const activeClients = useMemo(
    () =>
      clients
        .filter((c) => c.is_active)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'sv')),
    [clients]
  );

  const onSelect = useCallback(
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
      return (
        <TouchableOpacity
          style={[styles.row, !hasEmail && styles.rowDisabled]}
          onPress={() => onSelect(item)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}${hasEmail ? '' : ', saknar e-post'}`}
        >
          <View style={styles.rowText}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {hasEmail ? item.email : 'Lägg till e-post först'}
            </Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </TouchableOpacity>
      );
    },
    [onSelect]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.newClientCard}>
          <Text style={styles.newClientTitle}>Ny klient</Text>
          <Text style={styles.newClientHint}>
            Saknas personen i listan? Skapa med namn och e-post och gå vidare till bedömningen.
          </Text>
          <Text style={styles.inputLabel}>Namn</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="För- och efternamn"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            editable={!creating}
          />
          <Text style={styles.inputLabel}>E-post</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="namn@exempel.se"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!creating}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, creating && styles.primaryBtnDisabled]}
            onPress={handleCreateAndContinue}
            disabled={creating}
            accessibilityRole="button"
            accessibilityLabel="Skapa klient och fortsätt till rörelsebedömning"
          >
            {creating ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryBtnText}>Skapa klient och fortsätt</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Dina klienter</Text>
      </View>
    ),
    [creating, handleCreateAndContinue, newEmail, newName]
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyInline}>
        <Text style={styles.emptyText}>
          Inga sparade klienter ännu. Använd formuläret ovan eller lägg till fler under Klienter.
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Välj klient</Text>
        <Text style={styles.subtitle}>
          Rörelsebedömning kräver e-post på mottagaren (synk mot screening).
        </Text>
      </View>

      <FlatList
        data={activeClients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 8 },
  back: { color: colors.primary, fontSize: 16, marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  headerBlock: { marginBottom: 8 },
  newClientCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  newClientTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  newClientHint: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  inputLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 12,
    fontSize: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  sectionLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  list: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowDisabled: { opacity: 0.75 },
  rowText: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  chevron: { color: colors.textSecondary, fontSize: 22 },
  sep: { height: 10 },
  emptyInline: { paddingVertical: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});

export default MovementAssessmentClientPickScreen;
