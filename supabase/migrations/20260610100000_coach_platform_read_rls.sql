-- Coach read-access to platform tables for assigned athletes (via clients.client_user_id).

CREATE OR REPLACE FUNCTION coach_can_read_athlete(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM clients c
    WHERE c.assigned_pt_id = auth.uid()
      AND c.client_user_id = target_user_id
      AND c.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION coach_can_read_program(program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM program_assignments pa
    JOIN clients c ON c.client_user_id = pa.athlete_id
    WHERE pa.program_id = coach_can_read_program.program_id
      AND c.assigned_pt_id = auth.uid()
      AND c.is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM training_programs_tracker p
    WHERE p.id = coach_can_read_program.program_id
      AND p.coach_id = auth.uid()
  );
$$;

-- Timer
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workout_sessions_coach_select ON workout_sessions;
CREATE POLICY workout_sessions_coach_select ON workout_sessions
  FOR SELECT USING (coach_can_read_athlete(user_id));

ALTER TABLE planned_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planned_sessions_coach_select ON planned_sessions;
CREATE POLICY planned_sessions_coach_select ON planned_sessions
  FOR SELECT USING (coach_can_read_athlete(user_id));

ALTER TABLE user_program_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_program_subscriptions_coach_select ON user_program_subscriptions;
CREATE POLICY user_program_subscriptions_coach_select ON user_program_subscriptions
  FOR SELECT USING (coach_can_read_athlete(user_id));

-- Goalsetter (partial)
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutrition_goals_coach_select ON nutrition_goals;
CREATE POLICY nutrition_goals_coach_select ON nutrition_goals
  FOR SELECT USING (coach_can_read_athlete(user_id));

ALTER TABLE nutrition_plan_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutrition_plan_assignments_coach_select ON nutrition_plan_assignments;
CREATE POLICY nutrition_plan_assignments_coach_select ON nutrition_plan_assignments
  FOR SELECT USING (coach_can_read_athlete(athlete_id));

ALTER TABLE physical_test_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS physical_test_results_coach_select ON physical_test_results;
CREATE POLICY physical_test_results_coach_select ON physical_test_results
  FOR SELECT USING (coach_can_read_athlete(user_id));

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS weight_entries_coach_select ON weight_entries;
CREATE POLICY weight_entries_coach_select ON weight_entries
  FOR SELECT USING (coach_can_read_athlete(user_id));

ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS water_entries_coach_select ON water_entries;
CREATE POLICY water_entries_coach_select ON water_entries
  FOR SELECT USING (coach_can_read_athlete(user_id));

-- Adapt
ALTER TABLE training_programs_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_programs_tracker_coach_select ON training_programs_tracker;
CREATE POLICY training_programs_tracker_coach_select ON training_programs_tracker
  FOR SELECT USING (coach_id = auth.uid() OR coach_can_read_program(id));

ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS program_assignments_coach_select ON program_assignments;
CREATE POLICY program_assignments_coach_select ON program_assignments
  FOR SELECT USING (
    coach_id = auth.uid()
    OR coach_can_read_athlete(athlete_id)
  );

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_sessions_coach_select ON training_sessions;
CREATE POLICY training_sessions_coach_select ON training_sessions
  FOR SELECT USING (coach_can_read_program(program_id));

ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_exercises_coach_select ON session_exercises;
CREATE POLICY session_exercises_coach_select ON session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = session_exercises.session_id
        AND coach_can_read_program(ts.program_id)
    )
  );

-- Platform athlete profiles (read-only for roster enrichment)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_profiles_coach_select ON user_profiles;
CREATE POLICY user_profiles_coach_select ON user_profiles
  FOR SELECT USING (coach_can_read_athlete(user_id));
