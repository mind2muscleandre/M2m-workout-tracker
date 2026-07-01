-- Backfill coach SELECT read-paths for program-related tables.
-- Self-contained: ensures helper functions exist before policies reference them.

-- ---------------------------------------------------------------------------
-- Helper functions (idempotent)
-- ---------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION coach_can_read_athlete(target_user_id uuid)
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

REVOKE ALL ON FUNCTION coach_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION coach_is_admin() TO service_role;

REVOKE ALL ON FUNCTION coach_can_read_athlete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_can_read_athlete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION coach_can_read_athlete(uuid) TO service_role;

REVOKE ALL ON FUNCTION coach_can_read_program(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION coach_can_read_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION coach_can_read_program(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Coach SELECT policies
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.mobility_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ohs_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.training_programs_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nutrition_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mobility_programs_coach_select ON public.mobility_programs;
CREATE POLICY mobility_programs_coach_select ON public.mobility_programs
  FOR SELECT
  USING (user_id IS NOT NULL AND coach_can_read_athlete(user_id));

DROP POLICY IF EXISTS ohs_programs_coach_select ON public.ohs_programs;
CREATE POLICY ohs_programs_coach_select ON public.ohs_programs
  FOR SELECT
  USING (user_id IS NOT NULL AND coach_can_read_athlete(user_id));

DROP POLICY IF EXISTS training_programs_tracker_coach_select ON public.training_programs_tracker;
CREATE POLICY training_programs_tracker_coach_select ON public.training_programs_tracker
  FOR SELECT
  USING (coach_id = auth.uid() OR coach_can_read_program(id));

DROP POLICY IF EXISTS program_assignments_coach_select ON public.program_assignments;
CREATE POLICY program_assignments_coach_select ON public.program_assignments
  FOR SELECT
  USING (
    coach_id = auth.uid()
    OR coach_can_read_athlete(athlete_id)
  );

DROP POLICY IF EXISTS nutrition_goals_coach_select ON public.nutrition_goals;
CREATE POLICY nutrition_goals_coach_select ON public.nutrition_goals
  FOR SELECT
  USING (coach_can_read_athlete(user_id));
