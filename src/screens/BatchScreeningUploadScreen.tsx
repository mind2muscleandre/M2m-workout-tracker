import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { uploadPtScreening, QueuePerson } from '../services/ptScreeningUpload';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionLabel } from '../components/ui/SectionLabel';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { colors, coachColors, fonts, borderRadius, shadows } from '../lib/theme';

type Props = StackScreenProps<RootStackParamList, 'BatchScreeningUpload'>;
type ScreeningMode = 'overhead_squat' | 'mobility';
type SlotKey = 'front' | 'right' | 'left' | 'mobility';
type UploadFlowMode = 'single' | 'queue';
type UploadJobStatus = 'pending' | 'uploading' | 'done' | 'failed';

interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

interface UploadJob {
  id: string;
  person: QueuePerson;
  injuryHistory?: string;
  analysisTypes: string[];
  files: PickedPhoto[];
  status: UploadJobStatus;
  error?: string;
  inviteSent?: boolean;
}

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

const SLOT_ICONS: Record<SlotKey, string> = {
  front: '🔼',
  right: '↔️',
  left: '⬅️',
  mobility: '🤸',
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
  const [activeSlot, setActiveSlot] = useState<SlotKey>('front');
  const [injuryHistory, setInjuryHistory] = useState('');
  const [photos, setPhotos] = useState<Partial<Record<SlotKey, PickedPhoto>>>({});
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeLabel, setAnalyzeLabel] = useState('');
  const isProcessingQueueRef = useRef(false);

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
  const primaryActionLabel =
    flowMode === 'queue' && !isLastInQueue ? 'Spara och nästa' : 'Analysera med AI';
  const uploadQueueSummary = useMemo(() => {
    const total = uploadJobs.length;
    const done = uploadJobs.filter((job) => job.status === 'done').length;
    const failed = uploadJobs.filter((job) => job.status === 'failed').length;
    const uploading = uploadJobs.filter((job) => job.status === 'uploading').length;
    return { total, done, failed, uploading };
  }, [uploadJobs]);
  const isCurrentPersonComplete = useMemo(
    () => slots.every((slot) => Boolean(photos[slot])),
    [slots, photos]
  );

  const queueProgressPct = useMemo(() => {
    if (uploadQueueSummary.total === 0) return 0;
    const weighted =
      uploadQueueSummary.done +
      uploadQueueSummary.uploading * 0.5 +
      uploadJobs.filter((j) => j.status === 'pending').length * 0.1;
    return Math.round((weighted / uploadQueueSummary.total) * 100);
  }, [uploadJobs, uploadQueueSummary]);

  useEffect(() => {
    if (uploadQueueSummary.uploading > 0) {
      setAnalyzeLabel('Laddar upp bilder…');
      setAnalyzeProgress(Math.max(queueProgressPct, 15));
    } else if (uploadQueueSummary.done > 0 && uploadQueueSummary.done < uploadQueueSummary.total) {
      setAnalyzeLabel('Förbehandlar bilder…');
      setAnalyzeProgress(queueProgressPct);
    } else if (
      uploadQueueSummary.total > 0 &&
      uploadQueueSummary.done === uploadQueueSummary.total
    ) {
      setAnalyzeLabel('Klar!');
      setAnalyzeProgress(100);
    } else if (isSubmittingJob) {
      setAnalyzeLabel('Sparar i kö…');
      setAnalyzeProgress(10);
    } else if (uploadQueueSummary.total === 0) {
      setAnalyzeProgress(0);
      setAnalyzeLabel('');
    }
  }, [uploadQueueSummary, queueProgressPct, isSubmittingJob]);

  const switchFlowMode = (nextMode: UploadFlowMode) => {
    setFlowMode(nextMode);
    setQueue([]);
    setQueueInput('');
    setActiveIndex(0);
    setPhotos({});
    setInjuryHistory('');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const processUploadQueue = async () => {
    if (isProcessingQueueRef.current) {
      return;
    }
    const nextPending = uploadJobs.find((job) => job.status === 'pending');
    if (!nextPending) {
      return;
    }
    isProcessingQueueRef.current = true;
    setUploadJobs((prev) =>
      prev.map((job) =>
        job.id === nextPending.id
          ? { ...job, status: 'uploading', error: undefined }
          : job
      )
    );

    try {
      const result = await uploadPtScreening({
        person: nextPending.person,
        injuryHistory: nextPending.injuryHistory,
        analysisTypes: nextPending.analysisTypes,
        files: nextPending.files,
      });
      setUploadJobs((prev) =>
        prev.map((job) =>
          job.id === nextPending.id
            ? {
                ...job,
                status: 'done',
                error: undefined,
                inviteSent: result.invite_sent === true,
              }
            : job
        )
      );
      if (result.invite_sent) {
        setSuccessMessage(
          `Inbjudan skickad till ${result.target_email ?? nextPending.person.email}. Atleten kan sätta lösenord via mailet.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Uppladdningen misslyckades.';
      setUploadJobs((prev) =>
        prev.map((job) =>
          job.id === nextPending.id ? { ...job, status: 'failed', error: message } : job
        )
      );
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  useEffect(() => {
    void processUploadQueue();
  }, [uploadJobs]);

  const enqueueUploadJob = (
    person: QueuePerson,
    selectedPhotos: PickedPhoto[],
    analysisTypes: string[],
    notes: string
  ) => {
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setUploadJobs((prev) => [
      ...prev,
      {
        id: jobId,
        person,
        injuryHistory: notes.trim() || undefined,
        analysisTypes,
        files: selectedPhotos,
        status: 'pending',
      },
    ]);
  };

  const retryJob = (jobId: string) => {
    setUploadJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status: 'pending', error: undefined } : job))
    );
  };

  const goBackWithGuard = () => {
    const hasActiveJobs = uploadJobs.some(
      (job) => job.status === 'pending' || job.status === 'uploading'
    );
    if (!hasActiveJobs) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Uppladdningar pågår',
      'Det finns fortfarande uppladdningar i kön. Är du säker på att du vill lämna sidan?',
      [
        { text: 'Stanna kvar', style: 'cancel' },
        { text: 'Lämna', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
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
    setErrorMessage(null);
    Alert.alert('Kö skapad', `${parsed.length} personer är redo för screening.`);
  };

  const assignPhotoToSlot = (slot: SlotKey, asset: ImagePicker.ImagePickerAsset) => {
    const extension = asset.mimeType?.includes('png') ? 'png' : 'jpg';
    const image: PickedPhoto = {
      uri: asset.uri,
      name: `${slot}-${Date.now()}.${extension}`,
      type: asset.mimeType || `image/${extension}`,
    };
    setSuccessMessage(null);
    setErrorMessage(null);
    setPhotos((prev) => ({ ...prev, [slot]: image }));
  };

  const pickFromCamera = async (slot: SlotKey) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera nekad', 'Tillåt kamera för att kunna ta screeningbilder.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    assignPhotoToSlot(slot, result.assets[0]);
  };

  const pickFromLibrary = async (slot: SlotKey) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Bildbibliotek nekat', 'Tillåt bildbibliotek för att kunna välja screeningbilder.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    assignPhotoToSlot(slot, result.assets[0]);
  };

  const choosePhotoSource = (slot: SlotKey) => {
    setActiveSlot(slot);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      void pickFromLibrary(slot);
      return;
    }
    const slotLabel = SLOT_LABELS[slot];
    Alert.alert(
      `Bildkälla: ${slotLabel}`,
      'Välj hur du vill lägga till bilden.',
      [
        { text: 'Fota', onPress: () => void pickFromCamera(slot) },
        { text: 'Välj från bibliotek', onPress: () => void pickFromLibrary(slot) },
        { text: 'Avbryt', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const assignPhotoFromUri = (slot: SlotKey, uri: string) => {
    const image: PickedPhoto = {
      uri,
      name: `${slot}-${Date.now()}.jpg`,
      type: 'image/jpeg',
    };
    setSuccessMessage(null);
    setErrorMessage(null);
    setPhotos((prev) => ({ ...prev, [slot]: image }));
  };

  const handleUploadZoneFiles = (uris: string[]) => {
    const emptySlots = slots.filter((s) => !photos[s]);
    uris.forEach((uri, idx) => {
      const slot = emptySlots[idx] ?? activeSlot;
      assignPhotoFromUri(slot, uri);
    });
  };

  const pickMultipleFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Bildbibliotek nekat', 'Tillåt bildbibliotek för att kunna välja screeningbilder.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      handleUploadZoneFiles(result.assets.map((asset) => asset.uri));
    }
  };

  const removePhoto = (slot: SlotKey) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setSuccessMessage(null);
    setErrorMessage(null);
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
      setIsSubmittingJob(true);
      setSuccessMessage(null);
      setErrorMessage(null);
      const selectedPhotos = slots.map((slot) => photos[slot]).filter(Boolean) as PickedPhoto[];
      const analysisTypes = slots.map((slot) => ANALYSIS_FOR_SLOT[slot]);

      enqueueUploadJob(activePerson, selectedPhotos, analysisTypes, injuryHistory);

      if (flowMode === 'single') {
        setPhotos({});
        setInjuryHistory('');
        setSinglePerson({ name: '', email: '', team: '' });
        setSuccessMessage('Uppladdningen lades i kö och startar direkt.');
        return;
      }

      const isLast = activeIndex >= queue.length - 1;
      if (isLast) {
        setPhotos({});
        setInjuryHistory('');
        setSuccessMessage('Alla personer är tillagda i uppladdningskön.');
        return;
      }

      setActiveIndex((prev) => prev + 1);
      setPhotos({});
      setInjuryHistory('');
      setSuccessMessage('Sparat. Fortsätt med nästa person.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Försök igen.';
      setErrorMessage(message);
      Alert.alert('Uppladdning misslyckades', message);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  const flowTabs = [
    { id: 'single', label: 'En person' },
    { id: 'queue', label: 'Skapa kö' },
  ];

  const modeTabs = [
    { id: 'overhead_squat', label: 'Overhead squat' },
    { id: 'mobility', label: 'Mobility' },
  ];

  return (
    <ScreenContainer
      title="Bildscreening"
      scroll
      headerLeft={
        <TouchableOpacity onPress={goBackWithGuard}>
          <Text style={styles.backButton}>Tillbaka</Text>
        </TouchableOpacity>
      }
    >
      <FilterTabs
        tabs={flowTabs}
        activeId={flowMode}
        onChange={(id) => switchFlowMode(id as UploadFlowMode)}
      />

      {flowMode === 'single' ? (
        <GlassCard padding={16} style={styles.card}>
          <SectionLabel>Välj atlet</SectionLabel>
          <TextInput
            style={styles.singleInput}
            placeholder="Namn"
            placeholderTextColor={colors.textSecondary}
            value={singlePerson.name}
            onChangeText={(value) => {
              setSinglePerson((prev) => ({ ...prev, name: value }));
              setSuccessMessage(null);
              setErrorMessage(null);
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
              setErrorMessage(null);
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
              setErrorMessage(null);
            }}
          />
        </GlassCard>
      ) : (
        <GlassCard padding={16} style={styles.card}>
          <SectionLabel>Bygg kö</SectionLabel>
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
              setErrorMessage(null);
            }}
            placeholder="Anna Andersson,anna@exempel.se,Team A"
            placeholderTextColor={colors.textSecondary}
          />
          <Button label="Skapa kö" variant="secondary" onPress={buildQueue} />
        </GlassCard>
      )}

      {isQueueReady && activePerson && (
        <>
          <GlassCard padding={16} style={styles.card}>
            <SectionLabel>Aktiv person</SectionLabel>
            <Text style={styles.personText}>
              {activePerson.name} — {activePerson.email}
            </Text>
            <Text style={styles.helperText}>
              {activeIndex + 1} / {personCount}
            </Text>
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <TextInput
              style={styles.singleInput}
              placeholder="Skadehistorik (valfritt)"
              placeholderTextColor={colors.textSecondary}
              value={injuryHistory}
              onChangeText={(value) => {
                setInjuryHistory(value);
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
            />
          </GlassCard>

          <SectionLabel>Välj positioner att fotografera</SectionLabel>
          <FilterTabs
            tabs={modeTabs}
            activeId={mode}
            onChange={(id) => {
              const next = id as ScreeningMode;
              setMode(next);
              setPhotos({});
              setActiveSlot(SCREENING_SLOTS[next][0]);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
          />

          <View style={styles.positionGrid}>
            {slots.map((slot) => {
              const selected = activeSlot === slot;
              const hasPhoto = Boolean(photos[slot]);
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.posCard,
                    selected && styles.posCardSelected,
                    hasPhoto && styles.posCardDone,
                  ]}
                  onPress={() => {
                    setActiveSlot(slot);
                    choosePhotoSource(slot);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.posIcon}>{SLOT_ICONS[slot]}</Text>
                  <Text style={[styles.posName, (selected || hasPhoto) && styles.posNameActive]}>
                    {SLOT_LABELS[slot]}
                  </Text>
                  {hasPhoto ? <Text style={styles.posCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionLabel>Ladda upp bilder</SectionLabel>
          <TouchableOpacity
            style={styles.uploadZone}
            onPress={() => void pickMultipleFromLibrary()}
            activeOpacity={0.85}
          >
            <Text style={styles.uploadIcon}>↑</Text>
            <Text style={styles.uploadTitle}>Dra bilder hit eller klicka</Text>
            <Text style={styles.uploadSub}>Ladda upp en eller flera bilder per position</Text>
            <Text style={styles.uploadTypes}>JPG · PNG · HEIC · Max 20 MB/bild</Text>
          </TouchableOpacity>

          {slots.some((s) => photos[s]) ? (
            <View style={styles.previewRow}>
              {slots.map((slot) =>
                photos[slot] ? (
                  <View key={slot} style={styles.previewWrap}>
                    <TouchableOpacity
                      style={styles.previewThumb}
                      onPress={() => choosePhotoSource(slot)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: photos[slot]?.uri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.previewRemove}
                        onPress={() => removePhoto(slot)}
                        hitSlop={8}
                      >
                        <Text style={styles.previewRemoveText}>×</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    <Text style={styles.previewLabel} numberOfLines={1}>
                      {SLOT_LABELS[slot]}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              (!isCurrentPersonComplete || isSubmittingJob) && styles.analyzeBtnDisabled,
            ]}
            onPress={saveAndNext}
            disabled={!isCurrentPersonComplete || isSubmittingJob}
            activeOpacity={0.85}
          >
            {isSubmittingJob ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.analyzeBtnIcon}>⊕</Text>
                <Text
                  style={[
                    styles.analyzeBtnLabel,
                    (!isCurrentPersonComplete || isSubmittingJob) && styles.analyzeBtnLabelDisabled,
                  ]}
                >
                  {primaryActionLabel}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {(analyzeProgress > 0 || uploadQueueSummary.total > 0) && (
            <View style={styles.progressWrap}>
              <ProgressBar value={analyzeProgress} height={6} />
              {analyzeLabel ? <Text style={styles.progressLabel}>{analyzeLabel}</Text> : null}
            </View>
          )}
        </>
      )}

      {uploadJobs.length > 0 && (
        <GlassCard padding={16} style={styles.card}>
          <SectionLabel>Uppladdningskö</SectionLabel>
          <Text style={styles.helperText}>
            Klara: {uploadQueueSummary.done}/{uploadQueueSummary.total}
            {uploadQueueSummary.failed > 0 ? ` · Fel: ${uploadQueueSummary.failed}` : ''}
          </Text>
          {uploadJobs.map((job) => {
            const statusText =
              job.status === 'uploading'
                ? 'Laddar upp'
                : job.status === 'done'
                  ? 'Klar'
                  : job.status === 'failed'
                    ? 'Misslyckad'
                    : 'Väntar';

            return (
              <View key={job.id} style={styles.jobRow}>
                <View style={styles.jobTextWrap}>
                  <Text style={styles.personText}>
                    {job.person.name} — {statusText}
                  </Text>
                  {!!job.error && <Text style={styles.errorText}>{job.error}</Text>}
                  {job.status === 'done' && job.inviteSent === false && (
                    <Text style={styles.helperText}>
                      Befintlig användare — inget nytt inbjudningsmail.
                    </Text>
                  )}
                  {job.status === 'done' && job.inviteSent === true && (
                    <Text style={styles.helperText}>Inbjudningsmail skickat.</Text>
                  )}
                </View>
                {job.status === 'uploading' && <ActivityIndicator color={colors.primary} />}
                {job.status === 'done' && (
                  <Text style={styles.successText}>{job.inviteSent ? 'Inbjuden' : 'OK'}</Text>
                )}
                {job.status === 'failed' && (
                  <Button
                    label="Försök igen"
                    variant="ghost"
                    size="sm"
                    onPress={() => retryJob(job.id)}
                  />
                )}
              </View>
            );
          })}
        </GlassCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    color: coachColors.coach,
    fontWeight: '600',
    fontFamily: fonts.bodyMedium,
  },
  card: { marginBottom: 16 },
  helperText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 8,
  },
  personText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.bodySemiBold,
  },
  multilineInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 12,
    backgroundColor: coachColors.glassBg,
  },
  singleInput: {
    height: 40,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.md,
    color: coachColors.fg,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: coachColors.glassBg,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  posCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: coachColors.glassBg,
    borderWidth: 1,
    borderColor: coachColors.glassBorder,
    position: 'relative',
  },
  posCardSelected: {
    backgroundColor: coachColors.glassBgCoach,
    borderColor: 'rgba(0,212,170,0.28)',
  },
  posCardDone: {
    borderColor: 'rgba(0,212,170,0.35)',
  },
  posIcon: { fontSize: 24, marginBottom: 6 },
  posName: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: coachColors.mutedHi,
    textAlign: 'center',
  },
  posNameActive: { color: coachColors.coach },
  posCheck: {
    position: 'absolute',
    top: 6,
    right: 8,
    color: coachColors.coach,
    fontSize: 12,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  previewWrap: { alignItems: 'center', gap: 3 },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.28)',
    backgroundColor: coachColors.glassBg,
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  previewRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRemoveText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  previewLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: coachColors.muted,
    maxWidth: 72,
    textAlign: 'center',
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: coachColors.glassBorder,
    borderRadius: borderRadius.xl,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: coachColors.glassBg,
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 40,
    color: coachColors.muted,
    marginBottom: 12,
    lineHeight: 40,
  },
  uploadTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    color: coachColors.fg,
    marginBottom: 6,
    textAlign: 'center',
  },
  uploadSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: coachColors.muted,
    textAlign: 'center',
  },
  uploadTypes: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: coachColors.muted,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  analyzeBtn: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    backgroundColor: coachColors.coach,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    ...shadows.glowCoach,
  },
  analyzeBtnDisabled: {
    backgroundColor: coachColors.borderHi,
    shadowOpacity: 0,
    elevation: 0,
  },
  analyzeBtnIcon: {
    fontSize: 18,
    color: '#000',
    fontWeight: '700',
  },
  analyzeBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    fontFamily: fonts.bodyBold,
  },
  analyzeBtnLabelDisabled: {
    color: coachColors.muted,
  },
  progressWrap: { marginTop: 12, marginBottom: 8 },
  progressLabel: {
    textAlign: 'center',
    fontFamily: fonts.mono,
    fontSize: 10,
    color: coachColors.muted,
    marginTop: 8,
  },
  jobRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  jobTextWrap: { flex: 1, gap: 4 },
  successText: {
    color: colors.success,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontWeight: '600',
  },
});
