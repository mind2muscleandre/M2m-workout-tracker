import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { coachColors, fonts } from '../lib/theme';
import { AuthCard } from '../components/ui/AuthCard';
import { Button } from '../components/ui/Button';

type Props = StackScreenProps<RootStackParamList, 'AuthCallback'>;

const readAuthParamsFromUrl = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { code: null, type: null, accessToken: null, refreshToken: null, email: null };
  }

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    code: search.get('code'),
    type: hash.get('type') ?? search.get('type'),
    accessToken: hash.get('access_token') ?? search.get('access_token'),
    refreshToken: hash.get('refresh_token') ?? search.get('refresh_token'),
    email: hash.get('email') ?? search.get('email'),
  };
};

export default function AuthCallbackScreen({ navigation }: Props) {
  const [isHandling, setIsHandling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authParams = useMemo(() => readAuthParamsFromUrl(), []);

  useEffect(() => {
    const handleAuthLink = async () => {
      if (Platform.OS !== 'web') {
        navigation.replace('Auth');
        return;
      }

      try {
        setIsHandling(true);
        setError(null);

        if (authParams.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authParams.code);
          if (exchangeError) throw exchangeError;
        } else if (authParams.accessToken && authParams.refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: authParams.accessToken,
            refresh_token: authParams.refreshToken,
          });
          if (setSessionError) throw setSessionError;
        } else {
          throw new Error('Ingen giltig inloggningsinformation hittades i länken.');
        }

        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (authParams.type === 'recovery') {
          navigation.replace('UpdatePassword', { email: authParams.email ?? undefined });
          return;
        }

        navigation.replace('Auth');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ogiltig eller utgången länk.';
        setError(msg);
      } finally {
        setIsHandling(false);
      }
    };

    void handleAuthLink();
  }, [authParams, navigation]);

  return (
    <View style={styles.container}>
      <AuthCard title="M2M" subtitle="Verifierar länk">
        {isHandling ? (
          <>
            <ActivityIndicator color={coachColors.coach} />
            <Text style={styles.title}>Verifierar länk...</Text>
            <Text style={styles.subtitle}>Vänta en stund medan vi loggar in dig.</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Länken kunde inte verifieras</Text>
            <Text style={styles.errorText}>
              {error ?? 'Ogiltig eller utgången återställningslänk.'}
            </Text>
            <Button
              label="Skicka ny återställningslänk"
              variant="primary"
              onPress={() =>
                navigation.replace('UpdatePassword', { email: authParams.email ?? undefined })
              }
            />
            <Button
              label="Tillbaka till inloggning"
              variant="secondary"
              onPress={() => navigation.replace('Auth')}
            />
          </>
        )}
      </AuthCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coachColors.bg,
  },
  title: {
    color: coachColors.fg,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    textAlign: 'center',
  },
  subtitle: {
    color: coachColors.muted,
    fontSize: 14,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  errorText: {
    color: coachColors.orange,
    fontSize: 14,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
});
