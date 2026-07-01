import {
  fetchLibraryExercises,
  filterLibraryExercises,
  type LibraryExercise,
} from './exerciseLibrary';

/** @deprecated Use LibraryExercise from exerciseLibrary.ts */
export type PlatformExerciseRow = {
  id: string;
  name: string;
  category: string | null;
  muscle_groups: string[] | null;
  equipment: string | null;
  description: string | null;
};

function toLegacyRow(item: LibraryExercise): PlatformExerciseRow {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    muscle_groups: item.tags.length ? item.tags : item.muscleLabel ? [item.muscleLabel] : null,
    equipment: null,
    description: item.description,
  };
}

export async function fetchPlatformExercises(): Promise<PlatformExerciseRow[]> {
  const items = await fetchLibraryExercises();
  return items
    .filter((item) => item.source !== 'pt_exercises')
    .map(toLegacyRow);
}

export { fetchLibraryExercises, filterLibraryExercises, type LibraryExercise };
