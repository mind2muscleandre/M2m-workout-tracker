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
  const [queueInput, setQueueInput] = useState('');
  const [queue, setQueue] = useState<QueuePerson[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<ScreeningMode>('overhead_squat');
  const [injuryHistory, setInjuryHistory] = useState('');
  const [photos, setPhotos] = useState<Partial<Record<SlotKey, PickedPhoto>>>({});
  const [isUploading, setIsUploading] = useState(false);

  const activePerson = queue[activeIndex] ?? null;
  const slots = SCREENING_SLOTS[mode];

  const isQueueReady = queue.length > 0 && activePerson !== null;
  const isCurrentPersonComplete = useMemo(
    () => slots.every((slot) => Boolean(photos[slot])),
    [slots, photos]
  );

  const buildQueue = () => {
    const parsed = parseQueueInput(queueInput);
    if (parsed.length === 0) {
      Alert.alert('Ingen giltig kö', 'Ange minst en giltig rad med e-post.');
      return;
    }
    setQueue(parsed);
    setActiveIndex(0);
    setPhotos({});
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

    setPhotos((prev) => ({ ...prev, [slot]: image }));
  };

  const saveAndNext = async () => {
    if (!activePerson) {
      Alert.alert('Kön är tom', 'Skapa en kö först.');
      return;
    }

    if (!isCurrentPersonComplete) {
      Alert.alert('Bilder saknas', 'Fota alla obligatoriska vinklar innan du sparar.');
      return;
    }

    try {
      setIsUploading(true);
      const selectedPhotos = slots.map((slot) => photos[slot]).filter(Boolean) as PickedPhoto[];
      const analysisTypes = slots.map((slot) => ANALYSIS_FOR_SLOT[slot]);

      await uploadPtScreening({
        person: activePerson,
        injuryHistory,
        analysisTypes,
        files: selectedPhotos,
      });

      const isLast = activeIndex >= queue.length - 1;
      if (isLast) {
        Alert.alert('Klart', 'Alla personer i kön har laddats upp.');
        setPhotos({});
        setInjuryHistory('');
        return;
      }

      setActiveIndex((prev) => prev + 1);
      setPhotos({});
      setInjuryHistory('');
      Alert.alert('Sparat', 'Screeningen är sparad. Fortsätt med nästa person.');
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
          <Text style={styles.sectionTitle}>1) Bygg kö</Text>
          <Text style={styles.helperText}>
            En rad per person: namn,email,team eller endast email.
          </Text>
          <TextInput
            style={styles.multilineInput}
            multiline
            value={queueInput}
            onChangeText={setQueueInput}
            placeholder="Anna Andersson,anna@exempel.se,Team A"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={buildQueue}>
            <Text style={styles.primaryButtonText}>Skapa kö</Text>
          </TouchableOpacity>
        </View>

        {isQueueReady && activePerson && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2) Aktiv person</Text>
            <Text style={styles.personText}>
              {activePerson.name} - {activePerson.email}
            </Text>
            <Text style={styles.helperText}>
              {activeIndex + 1} / {queue.length}
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'overhead_squat' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('overhead_squat');
                  setPhotos({});
                }}
              >
                <Text style={styles.modeButtonText}>Overhead squat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'mobility' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('mobility');
                  setPhotos({});
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
              onChangeText={setInjuryHistory}
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
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Spara och nästa</Text>
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
});
