'use client';
import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { ScheduleSlot } from '@/lib/admin-api';

export interface CalendarClass {
  id: number;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  scheduleSlots: ScheduleSlot[];
  _count?: { students: number };
}

const HOUR_H = 56;
const TIME_W = 60;
const START_H = 7;
const END_H = 22;
const TOTAL_H = END_H - START_H;

const DAY_CODE: Record<number, string> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};
const DAY_LABEL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const PALETTES = [
  { bg: '#EFF6FF', accent: '#3B82F6', text: '#1D4ED8' },
  { bg: '#F0FDF4', accent: '#22C55E', text: '#15803D' },
  { bg: '#FFF7ED', accent: '#F97316', text: '#C2410C' },
  { bg: '#FDF4FF', accent: '#A855F7', text: '#7E22CE' },
  { bg: '#FFF1F2', accent: '#F43F5E', text: '#BE123C' },
  { bg: '#F0FDFA', accent: '#14B8A6', text: '#0F766E' },
  { bg: '#FEFCE8', accent: '#EAB308', text: '#854D0E' },
  { bg: '#F1F5F9', accent: '#94A3B8', text: '#334155' },
];

function getMonday(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  return r;
}

function shiftDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function slotDuration(slot: ScheduleSlot): number {
  if (slot.endTime && slot.time) {
    const diff = parseHHMM(slot.endTime) - parseHHMM(slot.time);
    if (diff > 0) return diff;
  }
  return slot.duration ?? 1.5;
}

function fmtWeek(mon: Date, sun: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}, ${mon.getFullYear()}`;
}

interface Props {
  classes: CalendarClass[];
  accentColor: string;
}

export default function WeeklyCalendar({ classes, accentColor }: Props) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDays(weekStart, i)),
    [weekStart],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const colorMap = useMemo(() => {
    const m = new Map<number, (typeof PALETTES)[0]>();
    classes.forEach((c, i) => m.set(c.id, PALETTES[i % PALETTES.length]));
    return m;
  }, [classes]);

  const eventsPerDay = useMemo(() => weekDays.map(day => {
    const code = DAY_CODE[day.getDay()];
    return classes.flatMap(cls => {
      const s = new Date(cls.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(cls.endDate); e.setHours(23, 59, 59, 999);
      if (day < s || day > e) return [];
      const slots = Array.isArray(cls.scheduleSlots) ? cls.scheduleSlots : [];
      return slots.filter(sl => sl.day === code && sl.time).map(slot => ({ cls, slot }));
    });
  }), [classes, weekDays]);

  const hours = Array.from({ length: TOTAL_H }, (_, i) => START_H + i);

  return (
    <Box sx={{ bgcolor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Nav */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 2, borderBottom: '1px solid #E2E8F0' }}>
        <CalendarDays size={18} color={accentColor} />
        <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
          {fmtWeek(weekStart, weekDays[6])}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setWeekStart(getMonday(new Date()))}
          sx={{
            borderRadius: 2, fontSize: 12, borderColor: '#E2E8F0', color: '#64748B',
            minWidth: 0, px: 1.5, py: 0.5,
            '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' },
          }}
        >
          Today
        </Button>
        <IconButton size="small" onClick={() => setWeekStart(w => shiftDays(w, -7))} sx={{ color: '#64748B' }}>
          <ChevronLeft size={16} />
        </IconButton>
        <IconButton size="small" onClick={() => setWeekStart(w => shiftDays(w, 7))} sx={{ color: '#64748B' }}>
          <ChevronRight size={16} />
        </IconButton>
      </Box>

      {/* Day headers */}
      <Box sx={{ display: 'flex', borderBottom: '2px solid #E2E8F0' }}>
        <Box sx={{ width: TIME_W, flexShrink: 0, bgcolor: '#F8FAFC' }} />
        {weekDays.map((day, di) => {
          const isToday = sameDay(day, today);
          return (
            <Box
              key={di}
              sx={{
                flex: 1, py: 1.5, textAlign: 'center',
                borderLeft: '1px solid #E2E8F0',
                bgcolor: isToday ? '#F0FDF4' : '#F8FAFC',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: isToday ? '#16A34A' : '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {DAY_LABEL[di]}
              </Typography>
              <Box sx={{
                width: 34, height: 34, borderRadius: '50%', mx: 'auto', mt: 0.5,
                bgcolor: isToday ? '#22C55E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: isToday ? 'white' : '#0F172A', lineHeight: 1 }}>
                  {day.getDate()}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Scrollable time grid */}
      <Box sx={{ overflowY: 'auto', maxHeight: 560 }}>
        <Box sx={{ display: 'flex' }}>
          {/* Time labels */}
          <Box sx={{
            width: TIME_W, flexShrink: 0,
            position: 'relative', height: TOTAL_H * HOUR_H,
            bgcolor: '#F8FAFC', borderRight: '1px solid #E2E8F0',
          }}>
            {hours.map(h => (
              <Box
                key={h}
                sx={{ position: 'absolute', top: (h - START_H) * HOUR_H - 8, left: 0, right: 6, textAlign: 'right' }}
              >
                <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                  {String(h).padStart(2, '0')}:00
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Day columns */}
          {weekDays.map((day, di) => {
            const isToday = sameDay(day, today);
            return (
              <Box
                key={di}
                sx={{
                  flex: 1, position: 'relative', height: TOTAL_H * HOUR_H,
                  borderLeft: '1px solid #E2E8F0',
                  bgcolor: isToday ? 'rgba(34,197,94,0.02)' : 'transparent',
                }}
              >
                {/* Hour lines */}
                {hours.map(h => (
                  <Box
                    key={h}
                    sx={{
                      position: 'absolute',
                      top: (h - START_H) * HOUR_H,
                      left: 0, right: 0,
                      borderTop: `1px solid ${h === START_H ? '#E2E8F0' : '#F1F5F9'}`,
                    }}
                  />
                ))}
                {/* Half-hour dashed lines */}
                {hours.map(h => (
                  <Box
                    key={`hh-${h}`}
                    sx={{
                      position: 'absolute',
                      top: (h - START_H) * HOUR_H + HOUR_H / 2,
                      left: 0, right: 0,
                      borderTop: '1px dashed #F1F5F9',
                    }}
                  />
                ))}

                {/* Events */}
                {eventsPerDay[di].map(({ cls, slot }) => {
                  const t = parseHHMM(slot.time);
                  const dur = slotDuration(slot);
                  const top = (t - START_H) * HOUR_H;
                  const rawHeight = dur * HOUR_H;
                  const p = colorMap.get(cls.id) ?? PALETTES[0];

                  // Skip if outside visible range
                  if (top + rawHeight < 0 || top > TOTAL_H * HOUR_H) return null;

                  const clampedTop = Math.max(0, top);
                  const clampedHeight = Math.max(28, Math.min(rawHeight - 4, TOTAL_H * HOUR_H - clampedTop));

                  return (
                    <Tooltip
                      key={`${cls.id}-${slot.day}`}
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{cls.name}</Typography>
                          <Typography sx={{ fontSize: 11 }}>
                            {slot.time}{slot.endTime ? ` – ${slot.endTime}` : ` · ${dur}h`} · {cls._count?.students ?? 0} học sinh
                          </Typography>
                          <Typography sx={{ fontSize: 11, opacity: 0.8 }}>{cls.code}</Typography>
                        </Box>
                      }
                      placement="right"
                      arrow
                    >
                      <Box sx={{
                        position: 'absolute',
                        top: clampedTop,
                        left: 3, right: 3,
                        height: clampedHeight,
                        bgcolor: p.bg,
                        borderLeft: `3px solid ${p.accent}`,
                        borderRadius: '0 6px 6px 0',
                        px: 0.75, py: 0.5,
                        overflow: 'hidden',
                        cursor: 'default',
                        transition: 'filter 0.15s',
                        '&:hover': { filter: 'brightness(0.95)' },
                        zIndex: 1,
                      }}>
                        <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: p.text, lineHeight: 1.3 }}>
                          {cls.name}
                        </Typography>
                        {clampedHeight >= 38 && (
                          <Typography sx={{ fontSize: 10, color: p.text, opacity: 0.75 }}>
                            {slot.time}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Legend */}
      {classes.length > 0 && (
        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, bgcolor: '#FAFAFA' }}>
          <Typography sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lớp:
          </Typography>
          {classes.map(cls => {
            const p = colorMap.get(cls.id) ?? PALETTES[0];
            return (
              <Box key={cls.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: p.accent, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, color: '#475569' }}>{cls.name}</Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
