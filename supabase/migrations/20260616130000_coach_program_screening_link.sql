-- Coach can read athlete programs via user_id OR linked screening session.
-- Also allows coaches to read their own platform data (self-view).

CREATE OR REPLACE FUNCTION coach_can_read_athlete(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coach_is_admin()
  OR target_user_id = auth.uid()
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
  )
  OR EXISTS (
    SELECT 1
    FROM training_programs_tracker p
    WHERE p.id = coach_can_read_program.program_id
      AND p.user_id IS NOT NULL
      AND coach_can_read_athlete(p.user_id)
  );
$$;

DROP POLICY IF EXISTS mobility_programs_coach_select ON public.mobility_programs;
CREATE POLICY mobility_programs_coach_select ON public.mobility_programs
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR EXISTS (
      SELECT 1
      FROM screening_uploads su
      WHERE su.screening_id::text = mobility_programs.screening_id::text
        AND su.user_id IS NOT NULL
        AND coach_can_read_athlete(su.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM screening_results sr
      WHERE sr.screening_id::text = mobility_programs.screening_id::text
        AND sr.user_id IS NOT NULL
        AND coach_can_read_athlete(sr.user_id)
    )
  );

DROP POLICY IF EXISTS ohs_programs_coach_select ON public.ohs_programs;
CREATE POLICY ohs_programs_coach_select ON public.ohs_programs
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR EXISTS (
      SELECT 1
      FROM screening_uploads su
      WHERE su.screening_id::text = ohs_programs.screening_id::text
        AND su.user_id IS NOT NULL
        AND coach_can_read_athlete(su.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM screening_results sr
      WHERE sr.screening_id::text = ohs_programs.screening_id::text
        AND sr.user_id IS NOT NULL
        AND coach_can_read_athlete(sr.user_id)
    )
  );

DROP POLICY IF EXISTS training_programs_tracker_coach_select ON public.training_programs_tracker;
CREATE POLICY training_programs_tracker_coach_select ON public.training_programs_tracker
  FOR SELECT
  USING (
    coach_id = auth.uid()
    OR coach_can_read_program(id)
    OR (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
  );
