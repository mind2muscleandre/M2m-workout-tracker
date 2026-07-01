-- Perform coach read RLS: screening results via programs, legacy uploads, movement assessments.

-- ---------------------------------------------------------------------------
-- Confirm coach_can_manage_athlete includes admin bypass (idempotent)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- screening_uploads: coach read by user_id; admin may read legacy NULL user_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS screening_uploads_coach_select ON screening_uploads;
CREATE POLICY screening_uploads_coach_select ON screening_uploads
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR (user_id IS NULL AND coach_is_admin())
  );

-- ---------------------------------------------------------------------------
-- screening_results: via upload, mobility_programs, or ohs_programs (text-safe)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS screening_results_coach_select ON screening_results;
CREATE POLICY screening_results_coach_select ON screening_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM screening_uploads su
      WHERE su.screening_id::text = screening_results.screening_id::text
        AND su.user_id IS NOT NULL
        AND coach_can_read_athlete(su.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM mobility_programs mp
      WHERE mp.screening_id::text = screening_results.screening_id::text
        AND mp.user_id IS NOT NULL
        AND coach_can_read_athlete(mp.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM ohs_programs op
      WHERE op.screening_id::text = screening_results.screening_id::text
        AND op.user_id IS NOT NULL
        AND coach_can_read_athlete(op.user_id)
    )
  );

-- ---------------------------------------------------------------------------
-- mobility_programs / ohs_programs: require user_id (no open NULL rows)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS mobility_programs_coach_select ON mobility_programs;
CREATE POLICY mobility_programs_coach_select ON mobility_programs
  FOR SELECT
  USING (user_id IS NOT NULL AND coach_can_read_athlete(user_id));

DROP POLICY IF EXISTS ohs_programs_coach_select ON ohs_programs;
CREATE POLICY ohs_programs_coach_select ON ohs_programs
  FOR SELECT
  USING (user_id IS NOT NULL AND coach_can_read_athlete(user_id));

-- ---------------------------------------------------------------------------
-- movement_assessment_results: coach read for assigned athletes / admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS movement_assessment_results_coach_select ON movement_assessment_results;
CREATE POLICY movement_assessment_results_coach_select ON movement_assessment_results
  FOR SELECT
  USING (coach_can_read_athlete(user_id));
