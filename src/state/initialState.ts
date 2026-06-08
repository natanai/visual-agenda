import { DEFAULT_TOTAL_DURATION_MINUTES, ITEM_COLORS } from '../constants';
import type { AgendaItem, MeetingState, ThemeSettings } from '../types';

export const defaultTheme: ThemeSettings = {
  accentColor: '#7c3aed',
  backgroundColor: '#0f172a',
  panelColor: '#172033',
  textColor: '#f8fafc',
  compactMode: false
};

export const createAgendaItem = (index: number): AgendaItem => ({
  id: `agenda-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: `Topic ${index + 1}`,
  durationMinutes: null,
  color: ITEM_COLORS[index % ITEM_COLORS.length]
});

export const initialState: MeetingState = {
  title: 'Team Sync',
  totalDurationMinutes: DEFAULT_TOTAL_DURATION_MINUTES,
  status: 'setup',
  agendaItems: [
    { id: 'welcome', title: 'Welcome and goals', durationMinutes: 10, color: ITEM_COLORS[0] },
    { id: 'discussion', title: 'Discussion', durationMinutes: null, color: ITEM_COLORS[1] },
    { id: 'decisions', title: 'Decisions and next steps', durationMinutes: 10, color: ITEM_COLORS[2] }
  ],
  activeItemId: null,
  lastAgendaItemId: null,
  meetingStartedAt: null,
  meetingEndedAt: null,
  segments: [],
  theme: defaultTheme
};
