-- screening_results: allow coach read when user_id matches athlete directly (self-service screening).

DROP POLICY IF EXISTS screening_results_coach_select ON screening_results;
CREATE POLICY screening_results_coach_select ON screening_results
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR EXISTS (
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

-- screening_feedback: same read path for coach (feedback/program per session).
DROP POLICY IF EXISTS screening_feedback_coach_select ON screening_feedback;
CREATE POLICY screening_feedback_coach_select ON screening_feedback
  FOR SELECT
  USING (
    (user_id IS NOT NULL AND coach_can_read_athlete(user_id))
    OR EXISTS (
      SELECT 1
      FROM screening_results sr
      WHERE sr.screening_id::text = screening_feedback.screening_id::text
        AND sr.user_id IS NOT NULL
        AND coach_can_read_athlete(sr.user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM mobility_programs mp
      WHERE mp.screening_id::text = screening_feedback.screening_id::text
        AND mp.user_id IS NOT NULL
        AND coach_can_read_athlete(mp.user_id)
    )
  );
