export const SCHEMA_SQL = `-- PT Workout Tracker schema for unified M2M project (cqpiejeiwtcopjnhccgn).
-- Avoids collisions with platform tables: users, exercises, coach_notes.
-- Uses pt_users, pt_exercises, pt_coach_notes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('pt', 'client');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_category AS ENUM (
    'strength', 'power', 'conditioning', 'mobility', 'injury_prevention'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workout_status AS ENUM ('planned', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE workout_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE exercise_tracking_type AS ENUM ('weight', 'time', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PT profile extension (auth.users is source of truth; user_profiles used by authStore fallback)
CREATE TABLE IF NOT EXISTS pt_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'pt',
  gym_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assigned_pt_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  sport TEXT,
  age INTEGER,
  weight_kg DECIMAL(5,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_client_user_id_unique
  ON clients (client_user_id)
  WHERE client_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pt_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category exercise_category NOT NULL DEFAULT 'strength',
  tracking_type exercise_tracking_type NOT NULL DEFAULT 'weight',
  muscle_group TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT,
  description TEXT,
  video_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_pt_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by_pt_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES pt_exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER,
  target_reps TEXT,
  notes TEXT,
  is_superset_with_next BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight_kg DECIMAL(6,2),
  reps INTEGER,
  duration_seconds INTEGER,
  rest_time_seconds INTEGER,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rir INTEGER CHECK (rir >= 0 AND rir <= 10),
  notes TEXT,
  is_pr BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pt_id, client_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pt_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_pt ON clients(assigned_pt_id);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(assigned_pt_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pt_exercises_pt ON pt_exercises(created_by_pt_id);
CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_workouts_pt ON workouts(created_by_pt_id);
CREATE INDEX IF NOT EXISTS idx_conversations_pt ON conversations(pt_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_coach_notes_pt ON pt_coach_notes(pt_id, updated_at DESC);

ALTER TABLE pt_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_coach_notes ENABLE ROW LEVEL SECURITY;

-- pt_users
DROP POLICY IF EXISTS pt_users_read_own ON pt_users;
CREATE POLICY pt_users_read_own ON pt_users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS pt_users_update_own ON pt_users;
CREATE POLICY pt_users_update_own ON pt_users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS pt_users_insert_own ON pt_users;
CREATE POLICY pt_users_insert_own ON pt_users FOR INSERT WITH CHECK (auth.uid() = id);

-- clients
DROP POLICY IF EXISTS clients_pt_read ON clients;
CREATE POLICY clients_pt_read ON clients FOR SELECT USING (assigned_pt_id = auth.uid());
DROP POLICY IF EXISTS clients_pt_insert ON clients;
CREATE POLICY clients_pt_insert ON clients FOR INSERT WITH CHECK (assigned_pt_id = auth.uid());
DROP POLICY IF EXISTS clients_pt_update ON clients;
CREATE POLICY clients_pt_update ON clients FOR UPDATE USING (assigned_pt_id = auth.uid());
DROP POLICY IF EXISTS clients_pt_delete ON clients;
CREATE POLICY clients_pt_delete ON clients FOR DELETE USING (assigned_pt_id = auth.uid());
DROP POLICY IF EXISTS clients_self_read ON clients;
CREATE POLICY clients_self_read ON clients FOR SELECT USING (client_user_id = auth.uid());

-- pt_exercises
DROP POLICY IF EXISTS pt_exercises_pt_read ON pt_exercises;
CREATE POLICY pt_exercises_pt_read ON pt_exercises FOR SELECT USING (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS pt_exercises_pt_insert ON pt_exercises;
CREATE POLICY pt_exercises_pt_insert ON pt_exercises FOR INSERT WITH CHECK (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS pt_exercises_pt_update ON pt_exercises;
CREATE POLICY pt_exercises_pt_update ON pt_exercises FOR UPDATE USING (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS pt_exercises_pt_delete ON pt_exercises;
CREATE POLICY pt_exercises_pt_delete ON pt_exercises FOR DELETE USING (created_by_pt_id = auth.uid());

-- workouts
DROP POLICY IF EXISTS workouts_pt_read ON workouts;
CREATE POLICY workouts_pt_read ON workouts FOR SELECT USING (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS workouts_pt_insert ON workouts;
CREATE POLICY workouts_pt_insert ON workouts FOR INSERT WITH CHECK (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS workouts_pt_update ON workouts;
CREATE POLICY workouts_pt_update ON workouts FOR UPDATE USING (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS workouts_pt_delete ON workouts;
CREATE POLICY workouts_pt_delete ON workouts FOR DELETE USING (created_by_pt_id = auth.uid());
DROP POLICY IF EXISTS workouts_client_read ON workouts;
CREATE POLICY workouts_client_read ON workouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.id = workouts.client_id AND c.client_user_id = auth.uid())
);

-- workout_exercises + sets (PT + client read)
DROP POLICY IF EXISTS workout_exercises_pt_read ON workout_exercises;
CREATE POLICY workout_exercises_pt_read ON workout_exercises FOR SELECT USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.created_by_pt_id = auth.uid())
);
DROP POLICY IF EXISTS workout_exercises_pt_insert ON workout_exercises;
CREATE POLICY workout_exercises_pt_insert ON workout_exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.created_by_pt_id = auth.uid())
);
DROP POLICY IF EXISTS workout_exercises_pt_update ON workout_exercises;
CREATE POLICY workout_exercises_pt_update ON workout_exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.created_by_pt_id = auth.uid())
);
DROP POLICY IF EXISTS workout_exercises_pt_delete ON workout_exercises;
CREATE POLICY workout_exercises_pt_delete ON workout_exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_exercises.workout_id AND w.created_by_pt_id = auth.uid())
);
DROP POLICY IF EXISTS workout_exercises_client_read ON workout_exercises;
CREATE POLICY workout_exercises_client_read ON workout_exercises FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workouts w JOIN clients c ON c.id = w.client_id
    WHERE w.id = workout_exercises.workout_id AND c.client_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS sets_pt_read ON sets;
CREATE POLICY sets_pt_read ON sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = sets.workout_exercise_id AND w.created_by_pt_id = auth.uid()
  )
);
DROP POLICY IF EXISTS sets_pt_insert ON sets;
CREATE POLICY sets_pt_insert ON sets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = sets.workout_exercise_id AND w.created_by_pt_id = auth.uid()
  )
);
DROP POLICY IF EXISTS sets_pt_update ON sets;
CREATE POLICY sets_pt_update ON sets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = sets.workout_exercise_id AND w.created_by_pt_id = auth.uid()
  )
);
DROP POLICY IF EXISTS sets_pt_delete ON sets;
CREATE POLICY sets_pt_delete ON sets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE we.id = sets.workout_exercise_id AND w.created_by_pt_id = auth.uid()
  )
);
DROP POLICY IF EXISTS sets_client_read ON sets;
CREATE POLICY sets_client_read ON sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id
    JOIN clients c ON c.id = w.client_id
    WHERE we.id = sets.workout_exercise_id AND c.client_user_id = auth.uid()
  )
);

-- messaging
DROP POLICY IF EXISTS conversations_pt_all ON conversations;
CREATE POLICY conversations_pt_all ON conversations
  FOR ALL USING (pt_id = auth.uid()) WITH CHECK (pt_id = auth.uid());

DROP POLICY IF EXISTS messages_pt_select ON messages;
CREATE POLICY messages_pt_select ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.pt_id = auth.uid())
);
DROP POLICY IF EXISTS messages_pt_insert ON messages;
CREATE POLICY messages_pt_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.pt_id = auth.uid()
  )
);

DROP POLICY IF EXISTS pt_coach_notes_pt_all ON pt_coach_notes;
CREATE POLICY pt_coach_notes_pt_all ON pt_coach_notes
  FOR ALL USING (pt_id = auth.uid()) WITH CHECK (pt_id = auth.uid());

-- Unified screening RLS (same project as clients)
DROP POLICY IF EXISTS movement_assessment_results_select_assigned_pt ON public.movement_assessment_results;
CREATE POLICY movement_assessment_results_select_assigned_pt
  ON public.movement_assessment_results FOR SELECT TO authenticated
  USING (
    tracker_client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id::text = movement_assessment_results.tracker_client_id
        AND c.assigned_pt_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS screening_uploads_select_assigned_pt ON public.screening_uploads;
CREATE POLICY screening_uploads_select_assigned_pt
  ON public.screening_uploads FOR SELECT TO authenticated
  USING (
    uploaded_by_pt_id IS NOT NULL AND uploaded_by_pt_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION handle_new_pt_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pt_users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'pt')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_pt ON auth.users;
CREATE TRIGGER on_auth_user_created_pt
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_pt_user();
`;
