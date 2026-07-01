-- Allow coaches to read mobility/ohs programs linked via movement_assessment_results.id

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
    OR EXISTS (
      SELECT 1
      FROM movement_assessment_results mar
      WHERE mar.id::text = mobility_programs.screening_id::text
        AND coach_can_read_athlete(mar.user_id)
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
    OR EXISTS (
      SELECT 1
      FROM movement_assessment_results mar
      WHERE mar.id::text = ohs_programs.screening_id::text
        AND coach_can_read_athlete(mar.user_id)
    )
  );
