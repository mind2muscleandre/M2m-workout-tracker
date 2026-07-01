-- M2M Coach Ecosystem Hub: admin access, write RLS, tracker sessions, broadcasts, goalsetter schema.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Admin is determined via user_profiles.role (text).
-- pt_users.role is enum user_role ('pt' | 'client') — no 'admin' value there.
CREATE OR REPLACE FUNCTION coach_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND lower(coalesce(up.role::text, '')) IN ('admin', 'moderator')
  );
$$;

REVOKE ALL ON FUNCTION coach_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO service_role;

CREATE OR REPLACE FUNCTION coach_can_manage_athlete(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_is_admin()
  OR EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.assigned_pt_id = auth.uid()
      AND c.client_user_id = target_user_id
      AND c.is_active = true
  );
$$;

-- Admin listing uses coach_list_directory_users RPC (see 20260611130000_admin_rls_hardening.sql).
-- user_profiles read: coach_can_read_athlete only (admin bypass inside that function).

-- ---------------------------------------------------------------------------
-- workout_sessions_tracker (deploy from Tracker migration)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workout_sessions_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_session_id bigint NOT NULL,
  goal_key text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_tracker_goal_key_check CHECK (
    goal_key IN ('explosive', 'plyo', 'hypertrophy', 'functional', 'maxstrength', 'endurance')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_tracker_user_client_key
  ON public.workout_sessions_tracker (user_id, client_session_id);

CREATE INDEX IF NOT EXISTS workout_sessions_tracker_user_ended_idx
  ON public.workout_sessions_tracker (user_id, ended_at DESC);

ALTER TABLE public.workout_sessions_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own workout sessions tracker" ON public.workout_sessions_tracker;
CREATE POLICY "Users manage own workout sessions tracker"
  ON public.workout_sessions_tracker FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS workout_sessions_tracker_coach_select ON public.workout_sessions_tracker;
CREATE POLICY workout_sessions_tracker_coach_select ON public.workout_sessions_tracker
  FOR SELECT USING (coach_can_manage_athlete(user_id));

-- ---------------------------------------------------------------------------
-- Coach write policies — Tracker
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS training_programs_tracker_coach_write ON training_programs_tracker;
CREATE POLICY training_programs_tracker_coach_write ON training_programs_tracker
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND (user_id IS NULL OR coach_can_manage_athlete(user_id))
  );

DROP POLICY IF EXISTS training_programs_tracker_coach_update ON training_programs_tracker;
CREATE POLICY training_programs_tracker_coach_update ON training_programs_tracker
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND (user_id IS NULL OR coach_can_manage_athlete(user_id))
  );

DROP POLICY IF EXISTS workout_templates_tracker_coach_select ON workout_templates_tracker;
CREATE POLICY workout_templates_tracker_coach_select ON workout_templates_tracker
  FOR SELECT USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS workout_templates_tracker_coach_write ON workout_templates_tracker;
CREATE POLICY workout_templates_tracker_coach_write ON workout_templates_tracker
  FOR INSERT WITH CHECK (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS workout_templates_tracker_coach_update ON workout_templates_tracker;
CREATE POLICY workout_templates_tracker_coach_update ON workout_templates_tracker
  FOR UPDATE USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS program_schedule_slots_tracker_coach_select ON program_schedule_slots_tracker;
CREATE POLICY program_schedule_slots_tracker_coach_select ON program_schedule_slots_tracker
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_programs_tracker p
      WHERE p.id = program_schedule_slots_tracker.program_id
        AND (p.coach_id = auth.uid() OR coach_can_manage_athlete(p.user_id))
    )
  );

DROP POLICY IF EXISTS program_schedule_slots_tracker_coach_write ON program_schedule_slots_tracker;
CREATE POLICY program_schedule_slots_tracker_coach_write ON program_schedule_slots_tracker
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_programs_tracker p
      WHERE p.id = program_schedule_slots_tracker.program_id
        AND p.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Coach write policies — Perform programs & Macro
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS mobility_programs_coach_select ON mobility_programs;
CREATE POLICY mobility_programs_coach_select ON mobility_programs
  FOR SELECT USING (user_id IS NULL OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS mobility_programs_coach_update ON mobility_programs;
CREATE POLICY mobility_programs_coach_update ON mobility_programs
  FOR UPDATE USING (user_id IS NULL OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS ohs_programs_coach_select ON ohs_programs;
CREATE POLICY ohs_programs_coach_select ON ohs_programs
  FOR SELECT USING (user_id IS NULL OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS ohs_programs_coach_update ON ohs_programs;
CREATE POLICY ohs_programs_coach_update ON ohs_programs
  FOR UPDATE USING (user_id IS NULL OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS screening_uploads_coach_select ON screening_uploads;
CREATE POLICY screening_uploads_coach_select ON screening_uploads
  FOR SELECT USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS screening_results_coach_select ON screening_results;
CREATE POLICY screening_results_coach_select ON screening_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM screening_uploads su
      WHERE su.screening_id = screening_results.screening_id
        AND coach_can_manage_athlete(su.user_id)
    )
  );

DROP POLICY IF EXISTS meals_coach_select ON meals;
CREATE POLICY meals_coach_select ON meals
  FOR SELECT USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS tdee_history_coach_select ON tdee_history;
CREATE POLICY tdee_history_coach_select ON tdee_history
  FOR SELECT USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS nutrition_goals_coach_update ON nutrition_goals;
CREATE POLICY nutrition_goals_coach_update ON nutrition_goals
  FOR UPDATE USING (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS nutrition_goals_coach_insert ON nutrition_goals;
CREATE POLICY nutrition_goals_coach_insert ON nutrition_goals
  FOR INSERT WITH CHECK (coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS activity_streaks_coach_select ON activity_streaks;
CREATE POLICY activity_streaks_coach_select ON activity_streaks
  FOR SELECT USING (coach_can_manage_athlete(athlete_id));

-- ---------------------------------------------------------------------------
-- Broadcast messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.coach_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  target_scope text NOT NULL DEFAULT 'all',
  recipient_count integer NOT NULL DEFAULT 0,
  channels text[] NOT NULL DEFAULT ARRAY['in_app'],
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.coach_broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz,
  email_sent_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcast_id, user_id)
);

ALTER TABLE public.coach_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_broadcasts_sender ON public.coach_broadcasts;
CREATE POLICY coach_broadcasts_sender ON public.coach_broadcasts
  FOR ALL USING (sender_id = auth.uid() OR coach_is_admin());

DROP POLICY IF EXISTS coach_broadcast_recipients_pt ON public.coach_broadcast_recipients;
CREATE POLICY coach_broadcast_recipients_pt ON public.coach_broadcast_recipients
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM coach_broadcasts b
      WHERE b.id = coach_broadcast_recipients.broadcast_id
        AND (b.sender_id = auth.uid() OR coach_is_admin())
    )
  );

DROP POLICY IF EXISTS coach_broadcast_recipients_insert ON public.coach_broadcast_recipients;
CREATE POLICY coach_broadcast_recipients_insert ON public.coach_broadcast_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_broadcasts b
      WHERE b.id = coach_broadcast_recipients.broadcast_id
        AND (b.sender_id = auth.uid() OR coach_is_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Goalsetter schema (gs_*)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gs_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline date,
  factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gs_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.gs_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'daily',
  streak_current integer NOT NULL DEFAULT 0,
  streak_longest integer NOT NULL DEFAULT 0,
  last_done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gs_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.gs_goals(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES public.gs_habits(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  created_by_coach boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gs_habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.gs_habits(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gs_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gs_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gs_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gs_habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gs_goals_user ON public.gs_goals;
CREATE POLICY gs_goals_user ON public.gs_goals FOR ALL
  USING (auth.uid() = user_id OR coach_can_manage_athlete(user_id))
  WITH CHECK (auth.uid() = user_id OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS gs_habits_user ON public.gs_habits;
CREATE POLICY gs_habits_user ON public.gs_habits FOR ALL
  USING (auth.uid() = user_id OR coach_can_manage_athlete(user_id))
  WITH CHECK (auth.uid() = user_id OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS gs_tasks_user ON public.gs_tasks;
CREATE POLICY gs_tasks_user ON public.gs_tasks FOR ALL
  USING (auth.uid() = user_id OR coach_can_manage_athlete(user_id))
  WITH CHECK (auth.uid() = user_id OR coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS gs_habit_completions_user ON public.gs_habit_completions;
CREATE POLICY gs_habit_completions_user ON public.gs_habit_completions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gs_habits h
      WHERE h.id = gs_habit_completions.habit_id
        AND (h.user_id = auth.uid() OR coach_can_manage_athlete(h.user_id))
    )
  );
