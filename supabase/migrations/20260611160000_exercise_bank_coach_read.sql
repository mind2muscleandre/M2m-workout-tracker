-- Allow authenticated coaches to read exercise_bank for program editing (read-only).

ALTER TABLE IF EXISTS public.exercise_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exercise_bank_coach_select ON public.exercise_bank;

CREATE POLICY exercise_bank_coach_select ON public.exercise_bank
  FOR SELECT
  TO authenticated
  USING (true);
