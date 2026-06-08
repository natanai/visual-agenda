export type MeetingStatus = 'setup' | 'running' | 'paused' | 'ended';

export type SegmentKind = 'agenda' | 'offTopic' | 'paused';

export interface AgendaItem {
  id: string;
  title: string;
  durationMinutes: number | null;
  color: string;
}

export interface MeetingSegment {
  id: string;
  kind: SegmentKind;
  itemId?: string;
  startedAt: number;
  endedAt?: number;
}

export interface ThemeSettings {
  accentColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
  compactMode: boolean;
}

export interface MeetingState {
  title: string;
  totalDurationMinutes: number;
  status: MeetingStatus;
  agendaItems: AgendaItem[];
  activeItemId: string | null;
  lastAgendaItemId: string | null;
  meetingStartedAt: number | null;
  meetingEndedAt: number | null;
  segments: MeetingSegment[];
  theme: ThemeSettings;
}

export interface PersistedSetup {
  title: string;
  totalDurationMinutes: number;
  agendaItems: AgendaItem[];
  theme: ThemeSettings;
}

export interface VisualBlock {
  id: string;
  label: string;
  kind: 'agenda' | 'offTopic';
  itemId?: string;
  plannedMs: number;
  elapsedMs: number;
  remainingMs: number;
  heightPercent: number;
  status: 'done' | 'active' | 'pending' | 'offTopic';
  color: string;
}

export interface VisualCalculation {
  blocks: VisualBlock[];
  plannedByItemId: Record<string, number>;
  elapsedByItemId: Record<string, number>;
  offTopicMs: number;
  totalElapsedMs: number;
  plannedMeetingMs: number;
  overtimeMs: number;
}

export type MeetingAction =
  | { type: 'LOAD_PERSISTED_SETUP'; payload: PersistedSetup }
  | { type: 'UPDATE_MEETING_TITLE'; payload: string }
  | { type: 'UPDATE_TOTAL_DURATION'; payload: number }
  | { type: 'ADD_AGENDA_ITEM' }
  | { type: 'UPDATE_AGENDA_ITEM'; payload: { id: string; patch: Partial<Pick<AgendaItem, 'title' | 'durationMinutes' | 'color'>> } }
  | { type: 'REMOVE_AGENDA_ITEM'; payload: string }
  | { type: 'MOVE_AGENDA_ITEM'; payload: { id: string; direction: 'up' | 'down' } }
  | { type: 'UPDATE_THEME'; payload: Partial<ThemeSettings> }
  | { type: 'START_MEETING'; payload: { now: number } }
  | { type: 'PAUSE_MEETING'; payload: { now: number } }
  | { type: 'RESUME_MEETING'; payload: { now: number } }
  | { type: 'END_MEETING'; payload: { now: number } }
  | { type: 'START_OFF_TOPIC'; payload: { now: number } }
  | { type: 'STOP_OFF_TOPIC'; payload: { now: number } }
  | { type: 'COMPLETE_AGENDA_ITEM'; payload: { now: number } }
  | { type: 'SET_ACTIVE_AGENDA_ITEM'; payload: { id: string; now: number } }
  | { type: 'RESET_MEETING' };
