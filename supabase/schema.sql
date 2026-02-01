-- ============================================
-- PT Workout Tracker - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('pt', 'client');

CREATE TYPE exercise_category AS ENUM (
  'strength',
  'power',
  'conditioning',
  'mobility',
  'injury_prevention'
);

CREATE TYPE workout_status AS ENUM (
  'planned',
  'in_progress',
  'completed'
);

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'pt',
  gym_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients managed by PTs
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assigned_pt_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category exercise_category NOT NULL DEFAULT 'strength',
  muscle_group TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT,
  description TEXT,
  video_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_pt_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workouts (sessions)
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_pt_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  notes TEXT,
  total_duration_seconds INTEGER,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  template_name TEXT,
  status workout_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Workout exercises (bridge table)
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER,
  target_reps TEXT,
  notes TEXT,
  is_superset_with_next BOOLEAN NOT NULL DEFAULT FALSE
);

-- Individual sets logged during workout
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  rest_time_seconds INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rir INTEGER CHECK (rir >= 0 AND rir <= 10),
  notes TEXT,
  is_pr BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_clients_assigned_pt ON clients(assigned_pt_id);
CREATE INDEX idx_clients_active ON clients(assigned_pt_id, is_active);
CREATE INDEX idx_exercises_pt ON exercises(created_by_pt_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_workouts_client ON workouts(client_id);
CREATE INDEX idx_workouts_pt ON workouts(created_by_pt_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_workouts_status ON workouts(status);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_sets_workout_exercise ON sets(workout_exercise_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- USERS policies
-- ----------------------------------------

-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Allow insert during signup
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PTs can read users in the same gym
CREATE POLICY "users_read_same_gym" ON users
  FOR SELECT USING (
    gym_id IS NOT NULL
    AND gym_id = (SELECT gym_id FROM users WHERE id = auth.uid())
  );

-- ----------------------------------------
-- CLIENTS policies
-- ----------------------------------------

-- PTs can see their own clients
CREATE POLICY "clients_pt_read" ON clients
  FOR SELECT USING (assigned_pt_id = auth.uid());

-- PTs can create clients
CREATE POLICY "clients_pt_insert" ON clients
  FOR INSERT WITH CHECK (assigned_pt_id = auth.uid());

-- PTs can update their own clients
CREATE POLICY "clients_pt_update" ON clients
  FOR UPDATE USING (assigned_pt_id = auth.uid());

-- PTs can delete their own clients
CREATE POLICY "clients_pt_delete" ON clients
  FOR DELETE USING (assigned_pt_id = auth.uid());

-- Clients can read their own client record
CREATE POLICY "clients_self_read" ON clients
  FOR SELECT USING (client_user_id = auth.uid());

-- ----------------------------------------
-- EXERCISES policies
-- ----------------------------------------

-- PTs can read their own exercises
CREATE POLICY "exercises_pt_read" ON exercises
  FOR SELECT USING (created_by_pt_id = auth.uid());

-- PTs can read exercises from same gym
CREATE POLICY "exercises_gym_read" ON exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u1, users u2
      WHERE u1.id = exercises.created_by_pt_id
        AND u2.id = auth.uid()
        AND u1.gym_id IS NOT NULL
        AND u1.gym_id = u2.gym_id
    )
  );

-- PTs can create exercises
CREATE POLICY "exercises_pt_insert" ON exercises
  FOR INSERT WITH CHECK (created_by_pt_id = auth.uid());

-- PTs can update their own exercises
CREATE POLICY "exercises_pt_update" ON exercises
  FOR UPDATE USING (created_by_pt_id = auth.uid());

-- PTs can delete their own exercises
CREATE POLICY "exercises_pt_delete" ON exercises
  FOR DELETE USING (created_by_pt_id = auth.uid());

-- ----------------------------------------
-- WORKOUTS policies
-- ----------------------------------------

-- PTs can read workouts they created
CREATE POLICY "workouts_pt_read" ON workouts
  FOR SELECT USING (created_by_pt_id = auth.uid());

-- PTs can create workouts
CREATE POLICY "workouts_pt_insert" ON workouts
  FOR INSERT WITH CHECK (created_by_pt_id = auth.uid());

-- PTs can update their workouts
CREATE POLICY "workouts_pt_update" ON workouts
  FOR UPDATE USING (created_by_pt_id = auth.uid());

-- PTs can delete their workouts
CREATE POLICY "workouts_pt_delete" ON workouts
  FOR DELETE USING (created_by_pt_id = auth.uid());

-- Clients can read their own workouts (read-only)
CREATE POLICY "workouts_client_read" ON workouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = workouts.client_id
        AND clients.client_user_id = auth.uid()
    )
  );

-- ----------------------------------------
-- WORKOUT_EXERCISES policies
-- ----------------------------------------

-- PTs can manage workout_exercises for their workouts
CREATE POLICY "workout_exercises_pt_read" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_pt_insert" ON workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_pt_update" ON workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "workout_exercises_pt_delete" ON workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workouts
      WHERE workouts.id = workout_exercises.workout_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

-- Clients can read workout_exercises for their workouts
CREATE POLICY "workout_exercises_client_read" ON workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workouts
      JOIN clients ON clients.id = workouts.client_id
      WHERE workouts.id = workout_exercises.workout_id
        AND clients.client_user_id = auth.uid()
    )
  );

-- ----------------------------------------
-- SETS policies
-- ----------------------------------------

-- PTs can manage sets for their workouts
CREATE POLICY "sets_pt_read" ON sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_exercises
      JOIN workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = sets.workout_exercise_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "sets_pt_insert" ON sets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_exercises
      JOIN workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = sets.workout_exercise_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "sets_pt_update" ON sets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises
      JOIN workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = sets.workout_exercise_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

CREATE POLICY "sets_pt_delete" ON sets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workout_exercises
      JOIN workouts ON workouts.id = workout_exercises.workout_id
      WHERE workout_exercises.id = sets.workout_exercise_id
        AND workouts.created_by_pt_id = auth.uid()
    )
  );

-- Clients can read sets for their workouts
CREATE POLICY "sets_client_read" ON sets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_exercises
      JOIN workouts ON workouts.id = workout_exercises.workout_id
      JOIN clients ON clients.id = workouts.client_id
      WHERE workout_exercises.id = sets.workout_exercise_id
        AND clients.client_user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'pt')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check if a set is a PR
CREATE OR REPLACE FUNCTION check_pr()
RETURNS TRIGGER AS $$
DECLARE
  current_volume DECIMAL;
  max_volume DECIMAL;
  v_exercise_id UUID;
  v_client_id UUID;
BEGIN
  -- Get exercise_id and client_id for this set
  SELECT we.exercise_id, w.client_id
  INTO v_exercise_id, v_client_id
  FROM workout_exercises we
  JOIN workouts w ON w.id = we.workout_id
  WHERE we.id = NEW.workout_exercise_id;

  -- Calculate current volume (weight × reps)
  current_volume := COALESCE(NEW.weight_kg, 0) * COALESCE(NEW.reps, 0);

  -- Get max previous volume for this exercise + client
  SELECT COALESCE(MAX(s.weight_kg * s.reps), 0)
  INTO max_volume
  FROM sets s
  JOIN workout_exercises we ON we.id = s.workout_exercise_id
  JOIN workouts w ON w.id = we.workout_id
  WHERE we.exercise_id = v_exercise_id
    AND w.client_id = v_client_id
    AND s.id != NEW.id;

  -- Flag as PR if new volume exceeds previous max
  IF current_volume > max_volume AND current_volume > 0 THEN
    NEW.is_pr := TRUE;
  ELSE
    NEW.is_pr := FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for PR check
CREATE TRIGGER check_set_pr
  BEFORE INSERT OR UPDATE ON sets
  FOR EACH ROW EXECUTE FUNCTION check_pr();
