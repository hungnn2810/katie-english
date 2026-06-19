interface ScheduleSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "08:00"
  endTime: string; // "09:30"
}

/**
 * Count the total number of class sessions in a given month based on schedule slots.
 *
 * Deduplicates dayOfWeek values — if the same day appears multiple times in scheduleSlots
 * (e.g., two Monday time slots), it counts each Monday only once.
 *
 * @param scheduleSlots - Array of schedule slots from Class.scheduleSlots JSON field
 * @param month - Month number 1–12
 * @param year - Full year (e.g., 2026)
 * @returns Total session count for the month
 *
 * @example
 * // June 2026: 4 Mondays + 4 Wednesdays = 8
 * countSessionsInMonth([{ dayOfWeek: 1, ... }, { dayOfWeek: 3, ... }], 6, 2026) // 8
 */
export function countSessionsInMonth(
  scheduleSlots: ScheduleSlot[],
  month: number,
  year: number,
): number {
  if (!scheduleSlots || scheduleSlots.length === 0) return 0;

  const uniqueDays = new Set(scheduleSlots.map((s) => s.dayOfWeek));
  let count = 0;

  const firstDay = new Date(year, month - 1, 1); // 1st of month
  const lastDay = new Date(year, month, 0); // Last day of month

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0–6
    if (uniqueDays.has(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
      count++;
    }
  }

  return count;
}
