-- Enable coach sync from movement assessment action programs -> Perform mobility_programs.
-- Idempotent uniqueness per athlete + screening session and write policies for assigned athletes.

CREATE UNIQUE INDEX IF NOT EXISTS mobility_programs_user_screening_unique_idx
  ON public.mobility_programs (user_id, screening_id)
  WHERE user_id IS NOT NULL AND screening_id IS NOT NULL;

DROP POLICY IF EXISTS mobility_programs_coach_insert ON mobility_programs;
CREATE POLICY mobility_programs_coach_insert ON mobility_programs
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND coach_can_manage_athlete(user_id));

DROP POLICY IF EXISTS mobility_programs_coach_update ON mobility_programs;
CREATE POLICY mobility_programs_coach_update ON mobility_programs
  FOR UPDATE
  USING (user_id IS NOT NULL AND coach_can_manage_athlete(user_id))
  WITH CHECK (user_id IS NOT NULL AND coach_can_manage_athlete(user_id));
