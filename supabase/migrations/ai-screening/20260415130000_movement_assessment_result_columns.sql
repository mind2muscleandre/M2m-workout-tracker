-- Utökar movement_assessment_results med en kolumn per bedömningsområde (querybart som OH-squat_results per slot).
-- Kör mot AI screening-projektet efter bas-migrationen.

alter table public.movement_assessment_results
  add column if not exists resultat_hallning numeric(5, 2),
  add column if not exists resultat_rorlighet numeric(5, 2),
  add column if not exists resultat_karna numeric(5, 2),
  add column if not exists resultat_stabilitet numeric(5, 2),
  add column if not exists resultat_totalt numeric(5, 2),
  add column if not exists resultat_band text;

comment on column public.movement_assessment_results.resultat_hallning is 'Sektion 1: hållning / postural observation (0–100 skala)';
comment on column public.movement_assessment_results.resultat_rorlighet is 'Sektion 2: rörlighet & mobilitet';
comment on column public.movement_assessment_results.resultat_karna is 'Sektion 3: kärna, aktivering & styrka';
comment on column public.movement_assessment_results.resultat_stabilitet is 'Sektion 4: statisk & dynamisk stabilitet';
comment on column public.movement_assessment_results.resultat_totalt is 'Viktad totalsumma 0–100';
comment on column public.movement_assessment_results.resultat_band is 'Klassificering: excellent|good|fair|poor|critical';
