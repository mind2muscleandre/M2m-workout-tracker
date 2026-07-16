// ============================================
// PT Workout Tracker - Authentication Screen
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
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
import { useAuthStore } from '../stores/authStore';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import { AuthCard } from '../components/ui/AuthCard';
import { Button } from '../components/ui/Button';

// ============================================
// Auth Screen Component
// ============================================
// Coach-only app: every account created here is a PT (role is fixed).

export default function AuthScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const [isSignUp, setIsSignUp] = useState(route.params?.mode === 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { signIn, signUp } = useAuthStore();

  useEffect(() => {
    if (route.params?.mode === 'signup') {
      setIsSignUp(true);
    }
  }, [route.params?.mode]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Saknat fält', 'Ange din e-postadress.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Ogiltig e-post', 'Ange en giltig e-postadress.');
      return false;
    }

    if (!password) {
      Alert.alert('Saknat fält', 'Ange ditt lösenord.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Svagt lösenord', 'Lösenordet måste vara minst 6 tecken.');
      return false;
    }

    if (isSignUp && !fullName.trim()) {
      Alert.alert('Saknat fält', 'Ange ditt fullständiga namn.');
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, fullName.trim(), 'pt');
        Alert.alert(
          'Konto skapat! 🎉',
          'Vi har skickat ett aktiveringsmail till din e-postadress. Klicka på länken i mailet för att aktivera ditt konto, sedan kan du logga in.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsSignUp(false);
                setPassword('');
              },
            },
          ]
        );
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error: any) {
      const message =
        error?.message || 'Ett oväntat fel inträffade. Försök igen.';
      Alert.alert(isSignUp ? 'Registrering misslyckades' : 'Inloggning misslyckades', message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev);
    setFullName('');
    setEmail('');
    setPassword('');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <AuthCard>
          {isSignUp ? (
            <>
              <Text style={styles.authTitle}>Skapa konto</Text>
              <Text style={styles.authSub}>Registrera dig som coach hos M2M.</Text>
            </>
          ) : null}

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fullständigt namn</Text>
                <TextInput
                  style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                  placeholder="Ditt namn"
                  placeholderTextColor={coachColors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-post</Text>
              <TextInput
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                placeholder="coach@m2m.se"
                placeholderTextColor={coachColors.muted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lösenord</Text>
              <TextInput
                style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor={coachColors.muted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                editable={!isLoading}
              />
            </View>

            {!isSignUp ? (
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AuthReset', { email: email.trim() })}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotLink}>GLÖMT LÖSENORD?</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Button
              label={isSignUp ? 'Skapa konto' : 'Logga in'}
              variant="primary"
              onPress={handleAuth}
              disabled={isLoading}
              loading={isLoading}
              style={styles.submitBtn}
            />

            {!isSignUp ? (
              <View style={styles.oauthRow}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ELLER</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.oauthButtons}>
                  <TouchableOpacity style={styles.oauthBtn} disabled activeOpacity={0.7}>
                    <Text style={styles.oauthBtnText}>Apple</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.oauthBtn} disabled activeOpacity={0.7}>
                    <Text style={styles.oauthBtnText}>Google</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.oauthHint}>OAuth kommer snart</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Har du redan konto?' : 'Ny tränare på M2M?'}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} disabled={isLoading}>
              <Text style={styles.footerLink}>
                {isSignUp ? 'Logga in' : 'Skapa konto'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.onboardingLink}
            onPress={() => navigation.navigate('CoachOnboarding', { flow: 'welcome' })}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.onboardingLinkText}>
              {isSignUp ? 'Se en demo av coach-panelen' : 'Ny här? Se en demo först'}
            </Text>
          </TouchableOpacity>
        </AuthCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coachColors.bg,
  },
  keyboardView: {
    flex: 1,
  },
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
    lineHeight: 18,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
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
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: coachColors.fg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    fontFamily: fonts.body,
  },
  inputFocused: {
    borderColor: coachColors.accent,
    shadowColor: coachColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 2,
  },
  oauthRow: {
    gap: 10,
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: coachColors.border,
  },
  dividerText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: coachColors.muted,
  },
  oauthButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  oauthBtn: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  oauthBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: coachColors.mutedHi,
  },
  oauthHint: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    color: coachColors.muted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotLink: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
  },
  submitBtn: {
    height: 48,
    borderRadius: borderRadius.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    color: coachColors.muted,
    fontFamily: fonts.body,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
  },
  onboardingLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  onboardingLinkText: {
    fontSize: 11,
    color: coachColors.muted,
    fontFamily: fonts.bodyMedium,
    textAlign: 'center',
  },
});
