export const minutesToMs = (minutes: number): number => Math.max(0, minutes) * 60_000;

export const msToMinutes = (ms: number): number => Math.max(0, ms) / 60_000;

export const formatDuration = (ms: number): string => {
  const safeMs = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
