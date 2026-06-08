import type { MeetingSegment, MeetingState, VisualBlock, VisualCalculation } from '../types';
import { minutesToMs } from './time';

const segmentEnd = (segment: MeetingSegment, now: number, meetingEndedAt: number | null): number => {
  if (segment.endedAt !== undefined) return segment.endedAt;
  return meetingEndedAt ?? now;
};

export const calculatePlannedDurations = (state: MeetingState): Record<string, number> => {
  const plannedMeetingMs = minutesToMs(state.totalDurationMinutes);
  const manualTotal = state.agendaItems.reduce(
    (sum, item) => sum + (item.durationMinutes === null ? 0 : minutesToMs(item.durationMinutes)),
    0
  );
  const autoItems = state.agendaItems.filter((item) => item.durationMinutes === null);
  const autoDuration = autoItems.length > 0 ? Math.max(0, plannedMeetingMs - manualTotal) / autoItems.length : 0;

  return state.agendaItems.reduce<Record<string, number>>((durations, item) => {
    durations[item.id] = item.durationMinutes === null ? autoDuration : minutesToMs(item.durationMinutes);
    return durations;
  }, {});
};

const sumElapsed = (state: MeetingState, now: number) => {
  const elapsedByItemId: Record<string, number> = {};
  let offTopicMs = 0;

  for (const segment of state.segments) {
    const duration = Math.max(0, segmentEnd(segment, now, state.meetingEndedAt) - segment.startedAt);
    if (segment.kind === 'agenda' && segment.itemId) {
      elapsedByItemId[segment.itemId] = (elapsedByItemId[segment.itemId] ?? 0) + duration;
    }
    if (segment.kind === 'offTopic') {
      offTopicMs += duration;
    }
  }

  return { elapsedByItemId, offTopicMs };
};

export const calculateVisualBlocks = (state: MeetingState, now: number): VisualCalculation => {
  const plannedByItemId = calculatePlannedDurations(state);
  const { elapsedByItemId, offTopicMs } = sumElapsed(state, now);
  const plannedMeetingMs = minutesToMs(state.totalDurationMinutes);
  const activeItemId = state.status === 'running' ? state.activeItemId : null;

  const completedMs = state.agendaItems.reduce((sum, item) => {
    if (item.id === activeItemId) return sum;
    const elapsed = elapsedByItemId[item.id] ?? 0;
    return elapsed > 0 ? sum + elapsed : sum;
  }, 0);
  const activePlannedMs = activeItemId ? plannedByItemId[activeItemId] ?? 0 : 0;
  const activeElapsedMs = activeItemId ? elapsedByItemId[activeItemId] ?? 0 : 0;
  const activeDisplayMs = activeItemId ? Math.max(activePlannedMs, activeElapsedMs) : 0;
  const pendingItems = state.agendaItems.filter((item) => item.id !== activeItemId && (elapsedByItemId[item.id] ?? 0) === 0);
  const pendingBaseMs = pendingItems.reduce((sum, item) => sum + (plannedByItemId[item.id] ?? 0), 0);
  const availableForPendingMs = Math.max(0, plannedMeetingMs - completedMs - activeDisplayMs - offTopicMs);
  const pendingScale = pendingBaseMs > 0 ? availableForPendingMs / pendingBaseMs : 0;

  const displayEntries = state.agendaItems.map((item) => {
    const plannedMs = plannedByItemId[item.id] ?? 0;
    const elapsedMs = elapsedByItemId[item.id] ?? 0;
    const isActive = item.id === activeItemId;
    const isDone = !isActive && elapsedMs > 0;
    const displayMs = isDone ? elapsedMs : isActive ? activeDisplayMs : plannedMs * pendingScale;
    return { item, plannedMs, elapsedMs, displayMs, isActive, isDone };
  });

  const agendaDisplayMs = displayEntries.reduce((sum, entry) => sum + Math.max(0, entry.displayMs), 0);
  const totalDisplayMs = Math.max(1, agendaDisplayMs + offTopicMs);

  const blocks: VisualBlock[] = displayEntries.map(({ item, plannedMs, elapsedMs, displayMs, isActive, isDone }) => ({
    id: item.id,
    itemId: item.id,
    label: item.title,
    kind: 'agenda',
    plannedMs,
    elapsedMs,
    remainingMs: Math.max(0, plannedMs - elapsedMs),
    heightPercent: (Math.max(0, displayMs) / totalDisplayMs) * 100,
    status: isActive ? 'active' : isDone ? 'done' : 'pending',
    color: item.color
  }));

  if (offTopicMs > 0) {
    blocks.push({
      id: 'off-topic',
      label: 'Off-topic',
      kind: 'offTopic',
      plannedMs: 0,
      elapsedMs: offTopicMs,
      remainingMs: 0,
      heightPercent: (offTopicMs / totalDisplayMs) * 100,
      status: 'offTopic',
      color: '#f97316'
    });
  }

  const totalElapsedMs = Object.values(elapsedByItemId).reduce((sum, value) => sum + value, 0) + offTopicMs;

  return {
    blocks,
    plannedByItemId,
    elapsedByItemId,
    offTopicMs,
    totalElapsedMs,
    plannedMeetingMs,
    overtimeMs: Math.max(0, totalElapsedMs - plannedMeetingMs)
  };
};
