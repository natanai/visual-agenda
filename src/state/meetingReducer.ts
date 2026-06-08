import { ITEM_COLORS } from '../constants';
import type { MeetingAction, MeetingSegment, MeetingState } from '../types';
import { createAgendaItem, initialState } from './initialState';

const segmentId = (kind: MeetingSegment['kind'], now: number) => `${kind}-${now}-${Math.random().toString(36).slice(2)}`;

const closeOpenSegment = (segments: MeetingSegment[], now: number): MeetingSegment[] =>
  segments.map((segment) => (segment.endedAt === undefined ? { ...segment, endedAt: now } : segment));

const appendSegment = (segments: MeetingSegment[], segment: Omit<MeetingSegment, 'id'>): MeetingSegment[] => [
  ...segments,
  { ...segment, id: segmentId(segment.kind, segment.startedAt) }
];

const nextAgendaItemId = (state: MeetingState): string | null => {
  if (state.agendaItems.length === 0) return null;
  if (!state.activeItemId) return state.agendaItems[0]?.id ?? null;

  const currentIndex = state.agendaItems.findIndex((item) => item.id === state.activeItemId);
  return state.agendaItems[currentIndex + 1]?.id ?? null;
};

const swapItem = (state: MeetingState, id: string, direction: 'up' | 'down'): MeetingState => {
  const index = state.agendaItems.findIndex((item) => item.id === id);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= state.agendaItems.length) return state;

  const agendaItems = [...state.agendaItems];
  const [item] = agendaItems.splice(index, 1);
  agendaItems.splice(targetIndex, 0, item);
  return { ...state, agendaItems };
};

export const meetingReducer = (state: MeetingState, action: MeetingAction): MeetingState => {
  switch (action.type) {
    case 'LOAD_PERSISTED_SETUP':
      return {
        ...state,
        title: action.payload.title,
        totalDurationMinutes: action.payload.totalDurationMinutes,
        agendaItems: action.payload.agendaItems,
        theme: action.payload.theme
      };

    case 'UPDATE_MEETING_TITLE':
      return { ...state, title: action.payload };

    case 'UPDATE_TOTAL_DURATION':
      return { ...state, totalDurationMinutes: Math.max(1, action.payload) };

    case 'ADD_AGENDA_ITEM':
      return { ...state, agendaItems: [...state.agendaItems, createAgendaItem(state.agendaItems.length)] };

    case 'UPDATE_AGENDA_ITEM':
      return {
        ...state,
        agendaItems: state.agendaItems.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.patch } : item
        )
      };

    case 'REMOVE_AGENDA_ITEM': {
      const agendaItems = state.agendaItems.filter((item) => item.id !== action.payload);
      return {
        ...state,
        agendaItems,
        activeItemId: state.activeItemId === action.payload ? agendaItems[0]?.id ?? null : state.activeItemId
      };
    }

    case 'MOVE_AGENDA_ITEM':
      return swapItem(state, action.payload.id, action.payload.direction);

    case 'UPDATE_THEME':
      return { ...state, theme: { ...state.theme, ...action.payload } };

    case 'START_MEETING': {
      const firstItemId = state.agendaItems[0]?.id ?? null;
      const segments = firstItemId
        ? appendSegment([], { kind: 'agenda', itemId: firstItemId, startedAt: action.payload.now })
        : [];

      return {
        ...state,
        status: 'running',
        activeItemId: firstItemId,
        lastAgendaItemId: firstItemId,
        meetingStartedAt: action.payload.now,
        meetingEndedAt: null,
        segments
      };
    }

    case 'PAUSE_MEETING':
      if (state.status !== 'running') return state;
      return {
        ...state,
        status: 'paused',
        segments: appendSegment(closeOpenSegment(state.segments, action.payload.now), {
          kind: 'paused',
          startedAt: action.payload.now
        })
      };

    case 'RESUME_MEETING': {
      if (state.status !== 'paused') return state;
      const itemId = state.activeItemId ?? state.lastAgendaItemId ?? state.agendaItems[0]?.id;
      const closed = closeOpenSegment(state.segments, action.payload.now);
      const segments = itemId ? appendSegment(closed, { kind: 'agenda', itemId, startedAt: action.payload.now }) : closed;
      return { ...state, status: 'running', activeItemId: itemId ?? null, lastAgendaItemId: itemId ?? null, segments };
    }

    case 'END_MEETING':
      return {
        ...state,
        status: 'ended',
        meetingEndedAt: action.payload.now,
        segments: closeOpenSegment(state.segments, action.payload.now)
      };

    case 'START_OFF_TOPIC':
      if (state.status !== 'running') return state;
      return {
        ...state,
        activeItemId: null,
        segments: appendSegment(closeOpenSegment(state.segments, action.payload.now), {
          kind: 'offTopic',
          startedAt: action.payload.now
        })
      };

    case 'STOP_OFF_TOPIC': {
      if (state.status !== 'running') return state;
      const itemId = state.lastAgendaItemId ?? state.agendaItems[0]?.id;
      const closed = closeOpenSegment(state.segments, action.payload.now);
      const segments = itemId ? appendSegment(closed, { kind: 'agenda', itemId, startedAt: action.payload.now }) : closed;
      return { ...state, activeItemId: itemId ?? null, segments };
    }

    case 'COMPLETE_AGENDA_ITEM': {
      if (state.status !== 'running') return state;
      const followingId = nextAgendaItemId(state);
      const closed = closeOpenSegment(state.segments, action.payload.now);
      const segments = followingId
        ? appendSegment(closed, { kind: 'agenda', itemId: followingId, startedAt: action.payload.now })
        : closed;
      return {
        ...state,
        activeItemId: followingId,
        lastAgendaItemId: followingId ?? state.lastAgendaItemId,
        status: followingId ? 'running' : 'ended',
        meetingEndedAt: followingId ? null : action.payload.now,
        segments
      };
    }

    case 'SET_ACTIVE_AGENDA_ITEM': {
      if (state.status !== 'running' || !state.agendaItems.some((item) => item.id === action.payload.id)) return state;
      return {
        ...state,
        activeItemId: action.payload.id,
        lastAgendaItemId: action.payload.id,
        segments: appendSegment(closeOpenSegment(state.segments, action.payload.now), {
          kind: 'agenda',
          itemId: action.payload.id,
          startedAt: action.payload.now
        })
      };
    }

    case 'RESET_MEETING':
      return {
        ...initialState,
        title: state.title,
        totalDurationMinutes: state.totalDurationMinutes,
        agendaItems: state.agendaItems.map((item, index) => ({
          ...item,
          color: item.color || ITEM_COLORS[index % ITEM_COLORS.length]
        })),
        theme: state.theme
      };

    default:
      return state;
  }
};
