// ============================================
// M2M Coach - Navigation Types
// ============================================

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MovementAssessmentSummary } from '../types/athlete';

export type RootStackParamList = {
  Auth: { mode?: 'signup' | 'login' } | undefined;
  CoachOnboarding: { flow?: 'welcome' | 'activation' } | undefined;
  AuthCallback: undefined;
  AuthReset: { email?: string } | undefined;
  UpdatePassword: { email?: string } | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  BatchScreeningUpload: undefined;
  ScreeningHub: undefined;
  MovementAssessmentClientPick: undefined;
  MovementAssessment: { clientId: string };
  MovementAssessmentProgramBuilder: {
    clientId: string;
    assessmentId: string;
    inviteSent?: boolean;
    targetEmail?: string;
    autoGenerate?: boolean;
  };
  MovementAssessmentResult: {
    clientId: string;
    assessment: MovementAssessmentSummary;
  };
  ClientDetail: { clientId: string };
  ClientManage: undefined;
  AthleteDetail: { clientId: string; userId?: string };
  ProgramBuilder: { programId?: string; clientId?: string; userId?: string };
  PerformProgramEditor: {
    programId: string;
    programType: 'mobility' | 'ohs';
    screeningId?: string;
    clientId?: string;
    userId?: string;
  };
  Broadcast: undefined;
  CreateSession: { clientId?: string } | undefined;
  SessionTimer: { clientId: string; workoutId?: string };
  WorkoutCreate: { clientId: string; templateWorkoutId?: string };
  WorkoutActive: { workoutId: string };
  ExercisePicker: { workoutId: string };
  ExerciseDetail: { exerciseId: string };
  Progression: { clientId: string; exerciseId?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Athletes: undefined;
  Programs: undefined;
  Sessions: undefined;
  Exercises: undefined;
  Messages: undefined;
  Broadcast: undefined;
  Notes: undefined;
  Reports: undefined;
  Screening: undefined;
  Profile: undefined;
};
