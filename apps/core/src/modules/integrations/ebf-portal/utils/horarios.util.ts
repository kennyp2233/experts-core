export interface OperationWindow {
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
}

const M = (h: number, m: number) => h * 60 + m;

export const COORDINACION_WINDOWS: OperationWindow[] = [
  { daysOfWeek: [1, 2, 3, 4, 5], startMinute: M(8, 0), endMinute: M(13, 30) },
  { daysOfWeek: [6], startMinute: M(8, 0), endMinute: M(12, 0) },
];

export const RECEPCION_WINDOWS: OperationWindow[] = [
  { daysOfWeek: [1, 2, 3, 4, 5], startMinute: M(16, 0), endMinute: M(21, 0) },
  { daysOfWeek: [6], startMinute: M(16, 0), endMinute: M(17, 0) },
];

interface WallClock {
  dayOfWeek: number;
  minuteOfDay: number;
}

function toWallClock(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(
    parts.find((p) => p.type === 'minute')?.value ?? '0',
    10,
  );

  return { dayOfWeek: weekdayMap[weekday] ?? 0, minuteOfDay: hour * 60 + minute };
}

export function isWithinWindow(
  windows: OperationWindow[],
  timeZone: string,
  now: Date = new Date(),
): boolean {
  const { dayOfWeek, minuteOfDay } = toWallClock(now, timeZone);
  return windows.some(
    (w) =>
      w.daysOfWeek.includes(dayOfWeek) &&
      minuteOfDay >= w.startMinute &&
      minuteOfDay < w.endMinute,
  );
}

export function describeWindows(windows: OperationWindow[]): string {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return windows
    .map((w) => {
      const days = w.daysOfWeek.map((d) => dayNames[d]).join('/');
      const fmt = (m: number) =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return `${days} ${fmt(w.startMinute)}–${fmt(w.endMinute)}`;
    })
    .join('; ');
}
