import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import { AuthCard } from '../components/ui/AuthCard';
import { Button } from '../components/ui/Button';

type Props = StackScreenProps<RootStackParamList, 'UpdatePassword'>;

const getDefaultRedirectUrl = (): string | undefined => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}`;
  }
  return undefined;
};

export default function UpdatePasswordScreen({ navigation, route }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isPasswordValid = useMemo(
    () => password.length >= 6 && password === confirmPassword,
    [password, confirmPassword]
  );

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setCanUpdatePassword(Boolean(data.session));
      } catch {
        setCanUpdatePassword(false);
      } finally {
        setIsCheckingSession(false);
      }
    };
    void checkRecoverySession();
  }, []);

  const resendRecoveryLink = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail.includes('@')) {
      Alert.alert('E-post saknas', 'Fyll i e-post för att skicka en ny återställningslänk.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const redirectTo = getDefaultRedirectUrl();
      const { error } = await supabase.auth.resetPasswordForEmail(
        targetEmail,
        redirectTo ? { redirectTo } : undefined
      );
      if (error) throw error;
      setStatusMessage('Ny återställningslänk skickad. Kontrollera din e-post.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte skicka återställningslänk.';
      setStatusMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNewPassword = async () => {
    if (!isPasswordValid) {
      Alert.alert(
        'Ogiltigt lösenord',
        'Lösenord måste vara minst 6 tecken och matcha i båda fälten.'
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('Lösenord uppdaterat', 'Ditt lösenord är sparat. Du kan nu logga in.');
      navigation.replace('Auth');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunde inte uppdatera lösenord.';
      setStatusMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return (
      <View style={styles.container}>
        <AuthCard title="M2M" subtitle="Återställning">
          <ActivityIndicator color={coachColors.coach} />
          <Text style={styles.title}>Verifierar återställningslänk...</Text>
        </AuthCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AuthCard title="M2M" subtitle="Uppdatera lösenord">
        <Text style={styles.heading}>Uppdatera lösenord</Text>

        {!canUpdatePassword ? (
          <>
            <Text style={styles.errorText}>
              Ogiltig eller utgången återställningslänk. Begär en ny återställningslänk.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="E-post"
              placeholderTextColor={coachColors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
            />
            <Button
              label="Skicka ny återställningslänk"
              variant="primary"
              onPress={resendRecoveryLink}
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nytt lösenord (minst 6 tecken)"
              placeholderTextColor={coachColors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Bekräfta nytt lösenord"
              placeholderTextColor={coachColors.muted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isSubmitting}
            />
            <Button
              label="Spara nytt lösenord"
              variant="primary"
              onPress={submitNewPassword}
              disabled={!isPasswordValid || isSubmitting}
              loading={isSubmitting}
            />
          </>
        )}

        {statusMessage ? (
          <Text
            style={
              statusMessage.includes('skickad') ? styles.successText : styles.errorText
            }
          >
            {statusMessage}
          </Text>
        ) : null}

        <Button
          label="Tillbaka till inloggning"
          variant="secondary"
          onPress={() => navigation.replace('Auth')}
        />
      </AuthCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coachColors.bg,
  },
  heading: {
    color: coachColors.fg,
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    textAlign: 'center',
  },
  input: {
    borderColor: coachColors.glassBorder,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    color: coachColors.fg,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    backgroundColor: coachColors.glassBg,
  },
  errorText: {
    color: coachColors.orange,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: coachColors.coach,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  title: {
    color: coachColors.fg,
    fontSize: 15,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
});
