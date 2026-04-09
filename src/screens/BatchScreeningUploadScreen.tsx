import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { uploadPtScreening, QueuePerson } from '../services/ptScreeningUpload';

type Props = StackScreenProps<RootStackParamList, 'BatchScreeningUpload'>;
type ScreeningMode = 'overhead_squat' | 'mobility';
type SlotKey = 'front' | 'right' | 'left' | 'mobility';
type UploadFlowMode = 'single' | 'queue';

interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

const colors = {
  background: '#0F0F0F',
  card: '#1A1A1A',
  primary: '#F7E928',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#2C2C2E',
  danger: '#FF3B30',
  success: '#34C759',
};

const ANALYSIS_FOR_SLOT: Record<SlotKey, string> = {
  front: 'overhead_squat_front',
  right: 'overhead_squat_right',
  left: 'overhead_squat_left',
  mobility: 'mobility',
};

const SCREENING_SLOTS: Record<ScreeningMode, SlotKey[]> = {
  overhead_squat: ['front', 'right', 'left'],
  mobility: ['mobility'],
};

const SLOT_LABELS: Record<SlotKey, string> = {
  front: 'Framifrån',
  right: 'Höger',
  left: 'Vänster',
  mobility: 'Mobility',
};

const parseQueueInput = (input: string): QueuePerson[] =>
  input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, second, third] = line.split(',').map((token) => token.trim());
      if (!second) {
        return { email: first.toLowerCase(), name: first };
      }
      return {
        name: first,
        email: second.toLowerCase(),
        team: third || undefined,
      };
    })
    .filter((person) => person.email.includes('@'));

export function BatchScreeningUploadScreen({ navigation }: Props) {
  const [flowMode, setFlowMode] = useState<UploadFlowMode>('single');
  const [singlePerson, setSinglePerson] = useState<QueuePerson>({ name: '', email: '', team: '' });
  const [queueInput, setQueueInput] = useState('');
  const [queue, setQueue] = useState<QueuePerson[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<ScreeningMode>('overhead_squat');
  const [injuryHistory, setInjuryHistory] = useState('');
  const [photos, setPhotos] = useState<Partial<Record<SlotKey, PickedPhoto>>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const singlePersonReady =
    singlePerson.name.trim().length > 0 && singlePerson.email.trim().includes('@');
  const activePerson =
    flowMode === 'single'
      ? singlePersonReady
        ? {
            name: singlePerson.name.trim(),
            email: singlePerson.email.trim().toLowerCase(),
            team: singlePerson.team?.trim() || undefined,
          }
        : null
      : queue[activeIndex] ?? null;
  const personCount = flowMode === 'single' ? 1 : queue.length;
  const isLastInQueue = flowMode === 'queue' && activeIndex >= queue.length - 1;
  const slots = SCREENING_SLOTS[mode];

  const isQueueReady = activePerson !== null;
  const uploadStatusText = activePerson
    ? `Laddar upp ${activePerson.name} (${activeIndex + 1}/${personCount})...`
    : 'Laddar upp...';
  const primaryActionLabel =
    flowMode === 'queue' && !isLastInQueue ? 'Spara och nästa' : 'Spara';
  const isCurrentPersonComplete = useMemo(
    () => slots.every((slot) => Boolean(photos[slot])),
    [slots, photos]
  );

  const switchFlowMode = (nextMode: UploadFlowMode) => {
    setFlowMode(nextMode);
    setQueue([]);
    setQueueInput('');
    setActiveIndex(0);
    setPhotos({});
    setInjuryHistory('');
    setSuccessMessage(null);
  };

  const goToHomeAfterSuccess = (message: string) => {
    setSuccessMessage(message);
    Alert.alert('Uppladdning klar', message, [
      {
        text: 'OK',
        onPress: () => navigation.navigate('MainTabs', { screen: 'Clients' }),
      },
    ]);
  };

  const buildQueue = () => {
    const parsed = parseQueueInput(queueInput);
    if (parsed.length === 0) {
      Alert.alert('Ingen giltig kö', 'Ange minst en giltig rad med e-post.');
      return;
    }
    setQueue(parsed);
    setActiveIndex(0);
    setPhotos({});
    setInjuryHistory('');
    setSuccessMessage(null);
    Alert.alert('Kö skapad', `${parsed.length} personer är redo för screening.`);
  };

  const pickFromCamera = async (slot: SlotKey) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera nekad', 'Tillåt kamera för att kunna ta screeningbilder.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const extension = asset.mimeType?.includes('png') ? 'png' : 'jpg';
    const image: PickedPhoto = {
      uri: asset.uri,
      name: `${slot}-${Date.now()}.${extension}`,
      type: asset.mimeType || `image/${extension}`,
    };

    setSuccessMessage(null);
    setPhotos((prev) => ({ ...prev, [slot]: image }));
  };

  const saveAndNext = async () => {
    if (!activePerson) {
      Alert.alert(
        flowMode === 'single' ? 'Personuppgifter saknas' : 'Kön är tom',
        flowMode === 'single'
          ? 'Fyll i namn och en giltig e-post för personen.'
          : 'Skapa en kö först.'
      );
      return;
    }

    if (!isCurrentPersonComplete) {
      Alert.alert('Bilder saknas', 'Fota alla obligatoriska vinklar innan du sparar.');
      return;
    }

    try {
      setIsUploading(true);
      setSuccessMessage(null);
      const selectedPhotos = slots.map((slot) => photos[slot]).filter(Boolean) as PickedPhoto[];
      const analysisTypes = slots.map((slot) => ANALYSIS_FOR_SLOT[slot]);

      await uploadPtScreening({
        person: activePerson,
        injuryHistory,
        analysisTypes,
        files: selectedPhotos,
      });

      if (flowMode === 'single') {
        setPhotos({});
        setInjuryHistory('');
        setSinglePerson({ name: '', email: '', team: '' });
        goToHomeAfterSuccess('Screeningen är uppladdad.');
        return;
      }

      const isLast = activeIndex >= queue.length - 1;
      if (isLast) {
        setQueue([]);
        setQueueInput('');
        setActiveIndex(0);
        setPhotos({});
        setInjuryHistory('');
        goToHomeAfterSuccess('Alla personer i kön är uppladdade.');
        return;
      }

      setActiveIndex((prev) => prev + 1);
      setPhotos({});
      setInjuryHistory('');
      setSuccessMessage('Sparat. Fortsätt med nästa person.');
    } catch (error) {
      Alert.alert(
        'Uppladdning misslyckades',
        error instanceof Error ? error.message : 'Försök igen.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Batch Screening</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Stäng</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1) Välj läge</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, flowMode === 'single' && styles.modeButtonActive]}
              onPress={() => switchFlowMode('single')}
            >
              <Text style={styles.modeButtonText}>En person</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, flowMode === 'queue' && styles.modeButtonActive]}
              onPress={() => switchFlowMode('queue')}
            >
              <Text style={styles.modeButtonText}>Skapa kö</Text>
            </TouchableOpacity>
          </View>
        </View>

        {flowMode === 'single' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2) Personuppgifter</Text>
            <TextInput
              style={styles.singleInput}
              placeholder="Namn"
              placeholderTextColor={colors.textSecondary}
              value={singlePerson.name}
              onChangeText={(value) => {
                setSinglePerson((prev) => ({ ...prev, name: value }));
                setSuccessMessage(null);
              }}
            />
            <TextInput
              style={styles.singleInput}
              placeholder="E-post"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textSecondary}
              value={singlePerson.email}
              onChangeText={(value) => {
                setSinglePerson((prev) => ({ ...prev, email: value }));
                setSuccessMessage(null);
              }}
            />
            <TextInput
              style={styles.singleInput}
              placeholder="Team (valfritt)"
              placeholderTextColor={colors.textSecondary}
              value={singlePerson.team ?? ''}
              onChangeText={(value) => {
                setSinglePerson((prev) => ({ ...prev, team: value }));
                setSuccessMessage(null);
              }}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2) Bygg kö</Text>
            <Text style={styles.helperText}>
              En rad per person: namn,email,team eller endast email.
            </Text>
            <TextInput
              style={styles.multilineInput}
              multiline
              value={queueInput}
              onChangeText={(value) => {
                setQueueInput(value);
                setSuccessMessage(null);
              }}
              placeholder="Anna Andersson,anna@exempel.se,Team A"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={buildQueue}>
              <Text style={styles.primaryButtonText}>Skapa kö</Text>
            </TouchableOpacity>
          </View>
        )}

        {isQueueReady && activePerson && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>3) Aktiv person</Text>
            <Text style={styles.personText}>
              {activePerson.name} - {activePerson.email}
            </Text>
            <Text style={styles.helperText}>
              {activeIndex + 1} / {personCount}
            </Text>
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'overhead_squat' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('overhead_squat');
                  setPhotos({});
                  setSuccessMessage(null);
                }}
              >
                <Text style={styles.modeButtonText}>Overhead squat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'mobility' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('mobility');
                  setPhotos({});
                  setSuccessMessage(null);
                }}
              >
                <Text style={styles.modeButtonText}>Mobility</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.singleInput}
              placeholder="Skadehistorik (valfritt)"
              placeholderTextColor={colors.textSecondary}
              value={injuryHistory}
              onChangeText={(value) => {
                setInjuryHistory(value);
                setSuccessMessage(null);
              }}
            />

            {slots.map((slot) => (
              <View key={slot} style={styles.photoRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => pickFromCamera(slot)}
                >
                  <Text style={styles.secondaryButtonText}>Fota {SLOT_LABELS[slot]}</Text>
                </TouchableOpacity>
                {photos[slot] ? (
                  <Image source={{ uri: photos[slot]?.uri }} style={styles.preview} />
                ) : (
                  <Text style={styles.missingText}>Saknas</Text>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isCurrentPersonComplete || isUploading) && styles.primaryButtonDisabled,
              ]}
              onPress={saveAndNext}
              disabled={!isCurrentPersonComplete || isUploading}
            >
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color={colors.background} />
                  <Text style={styles.primaryButtonText}>{uploadStatusText}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  backButton: {
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    color: colors.textSecondary,
  },
  personText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
  },
  singleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    padding: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.background,
    fontWeight: '700',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#2A2A10',
  },
  modeButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 6,
  },
  missingText: {
    color: colors.danger,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
    fontWeight: '600',
  },
});
