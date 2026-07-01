import { create } from 'zustand';
import {
  listCoachNotes,
  createCoachNote,
  updateCoachNote,
  deleteCoachNote,
  type CoachNote,
} from '../services/coachNotes';

interface NotesState {
  notes: CoachNote[];
  activeNote: CoachNote | null;
  isLoading: boolean;
  fetchNotes: (query?: string) => Promise<void>;
  selectNote: (note: CoachNote | null) => void;
  saveNote: (input: {
    id?: string;
    title: string;
    body: string;
    client_id?: string | null;
    tags?: string[];
  }) => Promise<CoachNote>;
  removeNote: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNote: null,
  isLoading: false,

  fetchNotes: async (query) => {
    set({ isLoading: true });
    try {
      const notes = await listCoachNotes(query);
      set({ notes });
    } finally {
      set({ isLoading: false });
    }
  },

  selectNote: (note) => set({ activeNote: note }),

  saveNote: async (input) => {
    let note: CoachNote;
    if (input.id) {
      note = await updateCoachNote(input.id, {
        title: input.title,
        body: input.body,
        client_id: input.client_id ?? null,
        tags: input.tags,
      });
    } else {
      note = await createCoachNote({
        title: input.title,
        body: input.body,
        client_id: input.client_id ?? null,
        tags: input.tags ?? [],
      });
    }
    await get().fetchNotes();
    set({ activeNote: note });
    return note;
  },

  removeNote: async (id) => {
    await deleteCoachNote(id);
    if (get().activeNote?.id === id) set({ activeNote: null });
    await get().fetchNotes();
  },
}));
