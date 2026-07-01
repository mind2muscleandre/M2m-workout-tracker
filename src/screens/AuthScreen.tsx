// ============================================
// PT Workout Tracker - Authentication Screen
// ============================================

import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import { UserRole } from '../types/database';
import { coachColors, fonts, borderRadius } from '../lib/theme';
import { AuthCard } from '../components/ui/AuthCard';
import { Button } from '../components/ui/Button';

// ============================================
// Role Option Component
// ============================================

interface RoleOptionProps {
  label: string;
  description: string;
  value: UserRole;
  selected: boolean;
  onSelect: (value: UserRole) => void;
}

function RoleOption({ label, description, value, selected, onSelect }: RoleOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.roleOption, selected && styles.roleOptionSelected]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <View style={styles.roleRadioOuter}>
        {selected && <View style={styles.roleRadioInner} />}
      </View>
      <View style={styles.roleTextContainer}>
        <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
          {label}
        </Text>
        <Text style={styles.roleDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// Auth Screen Component
// ============================================

export default function AuthScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pt');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

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
        await signUp(email.trim(), password, fullName.trim(), role);
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
    setRole('pt');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <AuthCard title="M2M" subtitle="Coach Platform">
          <Text style={styles.authTitle}>
            {isSignUp ? 'Skapa konto' : 'Välkommen tillbaka'}
          </Text>
          <Text style={styles.authSub}>
            {isSignUp
              ? 'Registrera dig som coach eller klient'
              : 'Logga in med dina coach-uppgifter'}
          </Text>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, !isSignUp && styles.tabActive]}
              onPress={() => !isLoading && setIsSignUp(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
                Logga in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isSignUp && styles.tabActive]}
              onPress={() => !isLoading && setIsSignUp(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
                Registrera
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fullständigt namn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ditt namn"
                  placeholderTextColor={coachColors.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            )}

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
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lösenord</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={coachColors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                editable={!isLoading}
              />
            </View>

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Jag är…</Text>
                <View style={styles.roleContainer}>
                  <RoleOption
                    label="Personlig tränare"
                    description="Skapa och hantera pass för klienter"
                    value="pt"
                    selected={role === 'pt'}
                    onSelect={setRole}
                  />
                  <RoleOption
                    label="Klient"
                    description="Visa och logga tilldelade pass"
                    value="client"
                    selected={role === 'client'}
                    onSelect={setRole}
                  />
                </View>
              </View>
            )}

            {!isSignUp ? (
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AuthReset', { email: email.trim() })}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotLink}>Glömt lösenord?</Text>
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
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Har du redan ett konto?' : 'Har du inget konto?'}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} disabled={isLoading}>
              <Text style={styles.footerLink}>
                {isSignUp ? 'Logga in' : 'Registrera'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionFoot}>M2M Coach v2.1.0 · Säker anslutning</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: coachColors.glassBg,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: coachColors.coach,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: coachColors.muted,
    fontFamily: fonts.bodyMedium,
  },
  tabTextActive: {
    color: '#000',
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
  roleContainer: {
    gap: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: coachColors.coach,
    backgroundColor: coachColors.coachDim,
  },
  roleRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: coachColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: coachColors.coach,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: coachColors.fg,
    marginBottom: 2,
    fontFamily: fonts.bodySemiBold,
  },
  roleLabelSelected: {
    color: coachColors.coach,
  },
  roleDescription: {
    fontSize: 12,
    color: coachColors.muted,
    fontFamily: fonts.body,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '500',
    color: coachColors.coach,
    fontFamily: fonts.bodyMedium,
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
  versionFoot: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: coachColors.muted,
    marginTop: 8,
  },
});
