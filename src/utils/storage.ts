import { STORAGE_KEY } from '../constants';
import type { MeetingState, PersistedSetup } from '../types';

export const toPersistedSetup = (state: MeetingState): PersistedSetup => ({
  title: state.title,
  totalDurationMinutes: state.totalDurationMinutes,
  agendaItems: state.agendaItems,
  theme: state.theme
});

export const loadPersistedSetup = (): PersistedSetup | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSetup;
  } catch {
    return null;
  }
};

export const savePersistedSetup = (state: MeetingState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedSetup(state)));
};
