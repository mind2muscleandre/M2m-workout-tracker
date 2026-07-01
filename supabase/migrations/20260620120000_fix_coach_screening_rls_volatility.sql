-- Fix: "SET is not allowed in a non-volatile function"
-- STABLE helpers from 20260618140000 used SET LOCAL in the body (forbidden).
-- Use function-level SET row_security = off instead (same pattern as coach_is_admin).

CREATE OR REPLACE FUNCTION public.coach_can_read_screening_id(p_screening_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

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
SET row_security = off
AS $$
BEGIN
  IF p_user_id IS NOT NULL AND coach_can_read_athlete(p_user_id) THEN
    RETURN true;
  END IF;

  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

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
SET row_security = off
AS $$
BEGIN
  IF p_user_id IS NOT NULL AND coach_can_read_athlete(p_user_id) THEN
    RETURN true;
  END IF;

  IF p_screening_id IS NULL OR btrim(p_screening_id) = '' THEN
    RETURN false;
  END IF;

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
