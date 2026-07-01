-- Missing on unified project: section score columns (base table existed before resultat_* migration).
alter table public.movement_assessment_results
  add column if not exists resultat_hallning numeric(5, 2),
  add column if not exists resultat_rorlighet numeric(5, 2),
  add column if not exists resultat_karna numeric(5, 2),
  add column if not exists resultat_stabilitet numeric(5, 2),
  add column if not exists resultat_totalt numeric(5, 2),
  add column if not exists resultat_band text;
