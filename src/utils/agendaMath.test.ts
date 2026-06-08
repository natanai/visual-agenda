import { describe, expect, it } from 'vitest';
import type { AgendaItem, MeetingState } from '../types';
import { calculatePlannedDurations, calculateVisualBlocks } from './agendaMath';

const minute = 60_000;

const items: AgendaItem[] = [
  { id: 'a', title: 'A', durationMinutes: 10, color: '#111111' },
  { id: 'b', title: 'B', durationMinutes: null, color: '#222222' },
  { id: 'c', title: 'C', durationMinutes: null, color: '#333333' }
];

const state = (overrides: Partial<MeetingState> = {}): MeetingState => ({
  title: 'Test',
  totalDurationMinutes: 60,
  status: 'setup',
  agendaItems: items,
  activeItemId: null,
  lastAgendaItemId: null,
  meetingStartedAt: null,
  meetingEndedAt: null,
  segments: [],
  theme: {
    accentColor: '#000000',
    backgroundColor: '#000000',
    panelColor: '#000000',
    textColor: '#ffffff',
    compactMode: false
  },
  ...overrides
});

const totalPercent = (calculation: ReturnType<typeof calculateVisualBlocks>) =>
  calculation.blocks.reduce((sum, block) => sum + block.heightPercent, 0);

describe('calculateVisualBlocks', () => {
  it('respects manual durations and allocates the remaining time to automatic items', () => {
    const planned = calculatePlannedDurations(state());

    expect(planned.a).toBe(10 * minute);
    expect(planned.b).toBe(25 * minute);
    expect(planned.c).toBe(25 * minute);
  });

  it('splits all time between automatic items when there are no manual durations', () => {
    const planned = calculatePlannedDurations(
      state({
        agendaItems: items.map((item) => ({ ...item, durationMinutes: null }))
      })
    );

    expect(planned.a).toBe(20 * minute);
    expect(planned.b).toBe(20 * minute);
    expect(planned.c).toBe(20 * minute);
  });

  it('stretches the active block when elapsed time exceeds its planned duration', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'running',
        activeItemId: 'a',
        meetingStartedAt: 0,
        segments: [{ id: 's1', kind: 'agenda', itemId: 'a', startedAt: 0 }]
      }),
      15 * minute
    );

    const active = calculation.blocks.find((block) => block.id === 'a');
    expect(active?.elapsedMs).toBe(15 * minute);
    expect(active?.heightPercent).toBeCloseTo(25);
    expect(totalPercent(calculation)).toBeCloseTo(100);
  });

  it('shrinks pending blocks when active overrun and off-topic time consume the plan', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'running',
        activeItemId: 'a',
        meetingStartedAt: 0,
        segments: [
          { id: 's1', kind: 'agenda', itemId: 'a', startedAt: 0, endedAt: 15 * minute },
          { id: 's2', kind: 'offTopic', startedAt: 15 * minute, endedAt: 20 * minute },
          { id: 's3', kind: 'agenda', itemId: 'a', startedAt: 20 * minute }
        ]
      }),
      20 * minute
    );

    const pending = calculation.blocks.filter((block) => block.status === 'pending');
    expect(calculation.offTopicMs).toBe(5 * minute);
    expect(pending[0]?.heightPercent).toBeCloseTo(33.333, 2);
    expect(pending[1]?.heightPercent).toBeCloseTo(33.333, 2);
    expect(totalPercent(calculation)).toBeCloseTo(100);
  });

  it('expands pending blocks when completed items used less than their planned time', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'running',
        activeItemId: 'b',
        meetingStartedAt: 0,
        segments: [
          { id: 's1', kind: 'agenda', itemId: 'a', startedAt: 0, endedAt: 5 * minute },
          { id: 's2', kind: 'agenda', itemId: 'b', startedAt: 5 * minute }
        ]
      }),
      5 * minute
    );

    const completed = calculation.blocks.find((block) => block.id === 'a');
    const active = calculation.blocks.find((block) => block.id === 'b');
    const pending = calculation.blocks.find((block) => block.id === 'c');

    expect(completed?.heightPercent).toBeCloseTo(8.333, 2);
    expect(active?.heightPercent).toBeCloseTo(41.667, 2);
    expect(pending?.heightPercent).toBeCloseTo(50, 2);
    expect(totalPercent(calculation)).toBeCloseTo(100);
  });

  it('adds off-topic time as its own visual block', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'running',
        activeItemId: null,
        meetingStartedAt: 0,
        segments: [{ id: 's1', kind: 'offTopic', startedAt: 0 }]
      }),
      6 * minute
    );

    const offTopic = calculation.blocks.find((block) => block.kind === 'offTopic');
    expect(offTopic?.elapsedMs).toBe(6 * minute);
    expect(offTopic?.heightPercent).toBeCloseTo(10);
  });

  it('keeps overtime heights non-negative', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'ended',
        meetingStartedAt: 0,
        meetingEndedAt: 80 * minute,
        segments: [{ id: 's1', kind: 'agenda', itemId: 'a', startedAt: 0, endedAt: 80 * minute }]
      }),
      80 * minute
    );

    expect(calculation.overtimeMs).toBe(20 * minute);
    expect(calculation.blocks.every((block) => block.heightPercent >= 0)).toBe(true);
    expect(totalPercent(calculation)).toBeCloseTo(100);
  });

  it('keeps percentage totals near 100 for mixed elapsed, pending, and off-topic blocks', () => {
    const calculation = calculateVisualBlocks(
      state({
        status: 'running',
        activeItemId: 'b',
        meetingStartedAt: 0,
        segments: [
          { id: 's1', kind: 'agenda', itemId: 'a', startedAt: 0, endedAt: 7 * minute },
          { id: 's2', kind: 'offTopic', startedAt: 7 * minute, endedAt: 10 * minute },
          { id: 's3', kind: 'agenda', itemId: 'b', startedAt: 10 * minute }
        ]
      }),
      18 * minute
    );

    expect(totalPercent(calculation)).toBeGreaterThan(99.999);
    expect(totalPercent(calculation)).toBeLessThan(100.001);
  });
});
