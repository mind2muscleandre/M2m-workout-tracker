// ============================================
// PT Workout Tracker - Authentication Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types/database';

// ============================================
// Design System Colors
// ============================================

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  success: '#34C759',
  danger: '#FF3B30',
  inputBg: '#1C1C1E',
};

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
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('pt');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

  // ----------------------------------------
  // Form Validation
  // ----------------------------------------

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Alert.alert('Missing Field', 'Please enter your email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    if (!password) {
      Alert.alert('Missing Field', 'Please enter your password.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return false;
    }

    if (isSignUp && !fullName.trim()) {
      Alert.alert('Missing Field', 'Please enter your full name.');
      return false;
    }

    return true;
  };

  // ----------------------------------------
  // Auth Handlers
  // ----------------------------------------

  const handleAuth = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, fullName.trim(), role);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error: any) {
      const message =
        error?.message || 'An unexpected error occurred. Please try again.';
      Alert.alert(isSignUp ? 'Sign Up Failed' : 'Sign In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // Toggle Auth Mode
  // ----------------------------------------

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('pt');
  };

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ---- Header / Branding ---- */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoText}>M2M</Text>
              </View>
            </View>
            <Text style={styles.title}>M2M Workout Tracker</Text>
            <Text style={styles.subtitle}>Personal Trainer Edition</Text>
          </View>

          {/* ---- Auth Card ---- */}
          <View style={styles.card}>
            {/* ---- Tab Toggle ---- */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !isSignUp && styles.tabActive]}
                onPress={() => !isLoading && setIsSignUp(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, isSignUp && styles.tabActive]}
                onPress={() => !isLoading && setIsSignUp(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* ---- Form Fields ---- */}
            <View style={styles.form}>
              {/* Full Name (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isSignUp ? 'Create a password (min 6 chars)' : 'Enter your password'}
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  editable={!isLoading}
                />
              </View>

              {/* Role Picker (Sign Up only) */}
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>I am a...</Text>
                  <View style={styles.roleContainer}>
                    <RoleOption
                      label="Personal Trainer"
                      description="Create and manage workouts for clients"
                      value="pt"
                      selected={role === 'pt'}
                      onSelect={setRole}
                    />
                    <RoleOption
                      label="Client"
                      description="View and log assigned workouts"
                      value="client"
                      selected={role === 'client'}
                      onSelect={setRole}
                    />
                  </View>
                </View>
              )}

              {/* ---- Submit Button ---- */}
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleAuth}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ---- Footer Toggle ---- */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} disabled={isLoading}>
              <Text style={styles.footerLink}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // ---- Header / Branding ----
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.primaryLight,
    fontWeight: '500',
  },

  // ---- Card ----
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ---- Tabs ----
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },

  // ---- Form ----
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ---- Role Picker ----
  roleContainer: {
    gap: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#6C5CE710',
  },
  roleRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: colors.primaryLight,
  },
  roleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ---- Button ----
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },

  // ---- Footer ----
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryLight,
  },
});
