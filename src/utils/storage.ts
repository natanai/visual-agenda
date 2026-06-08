import { STORAGE_KEY } from '../constants';
import type { AgendaItem, MeetingState, PersistedSetup, ThemeSettings } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isAgendaItem = (value: unknown): value is AgendaItem => {
  if (!isRecord(value)) return false;

  const duration = value.durationMinutes;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.color === 'string' &&
    (duration === null || (typeof duration === 'number' && Number.isFinite(duration) && duration >= 0))
  );
};

const isThemeSettings = (value: unknown): value is ThemeSettings => {
  if (!isRecord(value)) return false;

  return (
    typeof value.accentColor === 'string' &&
    typeof value.backgroundColor === 'string' &&
    typeof value.panelColor === 'string' &&
    typeof value.textColor === 'string' &&
    typeof value.compactMode === 'boolean'
  );
};

const isPersistedSetup = (value: unknown): value is PersistedSetup => {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === 'string' &&
    typeof value.totalDurationMinutes === 'number' &&
    Number.isFinite(value.totalDurationMinutes) &&
    value.totalDurationMinutes > 0 &&
    Array.isArray(value.agendaItems) &&
    value.agendaItems.every(isAgendaItem) &&
    isThemeSettings(value.theme)
  );
};

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

    const parsed: unknown = JSON.parse(raw);
    return isPersistedSetup(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const savePersistedSetup = (state: MeetingState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersistedSetup(state)));
  } catch {
    // Ignore storage write failures so privacy settings or quota issues do not blank the app.
  }
};
