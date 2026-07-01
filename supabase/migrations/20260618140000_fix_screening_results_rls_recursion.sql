-- Fix 42P17: infinite recursion between screening_results and mobility_programs/ohs_programs
-- coach policies referenced each other via EXISTS subqueries. Use SECURITY DEFINER helpers
-- with row_security off for cross-table lookups (same pattern as checkin_forms fix).

CREATE OR REPLACE FUNCTION public.coach_can_read_screening_id(p_screening_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

  SET LOCAL row_security = off;

  RETURN EXISTS (
    SELECT 1
    FROM screening_uploads su
    WHERE su.screening_id::text = p_screening_id
      AND su.user_id IS NOT NULL
      AND coach_can_read_athlete(su.user_id)
  )
  OR EXISTS (
    SELECT 1
    FROM screening_results sr
    WHERE sr.screening_id::text = p_screening_id
      AND sr.user_id IS NOT NULL
      AND coach_can_read_athlete(sr.user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_can_read_mobility_program_row(
  p_screening_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NOT NULL AND coach_can_read_athlete(p_user_id) THEN
    RETURN true;
  END IF;

  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

  SET LOCAL row_security = off;

  RETURN coach_can_read_screening_id(p_screening_id)
  OR EXISTS (
    SELECT 1
    FROM movement_assessment_results mar
    WHERE mar.id::text = p_screening_id
      AND coach_can_read_athlete(mar.user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_can_read_ohs_program_row(
  p_screening_id text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NOT NULL AND coach_can_read_athlete(p_user_id) THEN
    RETURN true;
  END IF;

  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

  SET LOCAL row_security = off;

  RETURN coach_can_read_screening_id(p_screening_id)
  OR EXISTS (
    SELECT 1
    FROM movement_assessment_results mar
    WHERE mar.id::text = p_screening_id
      AND coach_can_read_athlete(mar.user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coach_can_read_screening_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_can_read_screening_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_can_read_screening_id(text) TO service_role;

REVOKE ALL ON FUNCTION public.coach_can_read_mobility_program_row(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_can_read_mobility_program_row(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_can_read_mobility_program_row(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.coach_can_read_ohs_program_row(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_can_read_ohs_program_row(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_can_read_ohs_program_row(text, uuid) TO service_role;

-- screening_results: no cross-reference to mobility_programs / ohs_programs
DROP POLICY IF EXISTS screening_results_coach_select ON screening_results;
CREATE POLICY screening_results_coach_select ON screening_results
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR coach_can_read_screening_id(screening_id::text)
  );

-- mobility_programs / ohs_programs: no direct EXISTS against screening_results
DROP POLICY IF EXISTS mobility_programs_coach_select ON public.mobility_programs;
CREATE POLICY mobility_programs_coach_select ON public.mobility_programs
  FOR SELECT
  USING (
    coach_can_read_mobility_program_row(screening_id::text, user_id)
  );

DROP POLICY IF EXISTS ohs_programs_coach_select ON public.ohs_programs;
CREATE POLICY ohs_programs_coach_select ON public.ohs_programs
  FOR SELECT
  USING (
    coach_can_read_ohs_program_row(screening_id::text, user_id)
  );

-- screening_feedback: avoid screening_results subquery that re-enters policies
DROP POLICY IF EXISTS screening_feedback_coach_select ON screening_feedback;
CREATE POLICY screening_feedback_coach_select ON screening_feedback
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR coach_can_read_screening_id(screening_id::text)
    OR coach_can_read_mobility_program_row(screening_id::text, user_id)
  );
