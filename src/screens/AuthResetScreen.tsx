import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import { AuthCard } from '../components/ui/AuthCard';
import { Button } from '../components/ui/Button';

type Props = StackScreenProps<RootStackParamList, 'AuthReset'>;

const getRedirectUrl = (): string | undefined => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}`;
  }
  return undefined;
};

export default function AuthResetScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      Alert.alert('Ogiltig e-post', 'Ange en giltig e-postadress.');
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = getRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalized,
        redirectTo ? { redirectTo } : undefined
      );
      if (error) throw error;
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunde inte skicka länk.';
      Alert.alert('Misslyckades', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <AuthCard title="M2M" subtitle="Coach Platform">
          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.successTitle}>Kolla din e-post</Text>
              <Text style={styles.successBody}>
                Vi har skickat en återställningslänk till{' '}
                <Text style={styles.successEmail}>{email.trim()}</Text>. Länken är giltig i 30
                minuter.
              </Text>
              <Button
                label="Tillbaka till inloggning"
                variant="primary"
                onPress={() => navigation.navigate('Auth')}
                style={styles.successBtn}
              />
            </View>
          ) : (
            <>
              <Text style={styles.authTitle}>Glömt lösenord?</Text>
              <Text style={styles.authSub}>
                Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-postadress</Text>
                <TextInput
                  style={styles.input}
                  placeholder="coach@m2m.se"
                  placeholderTextColor={coachColors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <Button
                label={isLoading ? 'Skickar…' : 'Skicka återställningslänk'}
                variant="primary"
                onPress={handleSubmit}
                disabled={isLoading}
                loading={isLoading}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backLink}
              >
                <Text style={styles.backText}>← Tillbaka till inloggning</Text>
              </TouchableOpacity>
            </>
          )}
        </AuthCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: coachColors.bg },
  flex: { flex: 1 },
  authTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.fg,
    marginBottom: 6,
  },
  authSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.muted,
    marginBottom: 8,
    lineHeight: 20,
  },
  inputGroup: { gap: 6, marginBottom: 8 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  input: {
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    color: coachColors.fg,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: borderRadius.lg,
    marginBottom: 8,
  },
  backLink: { alignItems: 'center', marginTop: 4 },
  backText: {
    fontSize: 12,
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
  },
  successBox: { alignItems: 'center', gap: 12 },
  successIcon: { fontSize: 48, marginBottom: 4 },
  successTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.fg,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: coachColors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  successEmail: {
    color: coachColors.fg,
    fontFamily: fonts.bodySemiBold,
  },
  successBtn: {
    width: '100%',
    marginTop: 8,
    height: 48,
    borderRadius: borderRadius.lg,
  },
});
