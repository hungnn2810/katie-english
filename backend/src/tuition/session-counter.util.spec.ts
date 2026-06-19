import { countSessionsInMonth } from './session-counter.util';

describe('countSessionsInMonth', () => {
  it('returns 9 for Mon+Wed slots in June 2026 (5 Mon + 4 Wed)', () => {
    // June 1, 2026 is a Monday → 5 Mondays (1,8,15,22,29) + 4 Wednesdays (3,10,17,24) = 9
    // NOTE: The plan spec says 8 (4+4) but June 2026 actually has 5 Mondays — test corrected.
    const slots = [
      { dayOfWeek: 1 as const, startTime: '08:00', endTime: '09:30' }, // Monday
      { dayOfWeek: 3 as const, startTime: '08:00', endTime: '09:30' }, // Wednesday
    ];
    expect(countSessionsInMonth(slots, 6, 2026)).toBe(9);
  });

  it('returns 0 for empty slots array', () => {
    expect(countSessionsInMonth([], 6, 2026)).toBe(0);
  });

  it('returns 0 for null/undefined slots', () => {
    expect(countSessionsInMonth(null as any, 6, 2026)).toBe(0);
    expect(countSessionsInMonth(undefined as any, 6, 2026)).toBe(0);
  });

  it('returns 4 for Sunday slots in Feb 2026 (4 Sundays: 1,8,15,22)', () => {
    const slots = [{ dayOfWeek: 0 as const, startTime: '08:00', endTime: '09:30' }];
    expect(countSessionsInMonth(slots, 2, 2026)).toBe(4);
  });

  it('deduplicates same dayOfWeek — returns 5 not 10 when Mon appears twice (June 2026 has 5 Mondays)', () => {
    // June 2026: 5 Mondays (1,8,15,22,29). Two Monday slots must deduplicate to count 5, not 10.
    const slots = [
      { dayOfWeek: 1 as const, startTime: '08:00', endTime: '09:30' },
      { dayOfWeek: 1 as const, startTime: '14:00', endTime: '15:30' },
    ];
    expect(countSessionsInMonth(slots, 6, 2026)).toBe(5);
  });

  it('returns correct count for a month with 31 days (January 2026 — 4 Tuesdays)', () => {
    // Jan 2026: Tue = 6,13,20,27 (4 Tuesdays)
    const slots = [{ dayOfWeek: 2 as const, startTime: '08:00', endTime: '09:00' }];
    expect(countSessionsInMonth(slots, 1, 2026)).toBe(4);
  });

  it('handles all 7 days — returns total days in month', () => {
    const slots = [0, 1, 2, 3, 4, 5, 6].map(d => ({
      dayOfWeek: d as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: '08:00',
      endTime: '09:00',
    }));
    // June 2026 has 30 days
    expect(countSessionsInMonth(slots, 6, 2026)).toBe(30);
  });
});
