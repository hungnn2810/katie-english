export const colors = {
  primary: '#4F9DFF',
  secondary: '#6ED6C1',
  accent: '#FFD166',
  highlight: '#FF7B7B',
  purple: '#A78BFA',
  pink: '#FF9BD2',
  orange: '#FFB26B',
  green: '#7BD88F',
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  teacherAccent: '#3B82F6',
  adminAccent: '#6366F1',
  teacherAccentBg: '#EFF6FF',
  adminAccentBg: '#EEF2FF',
} as const;

export const gradients = {
  // Student game screens — soft lavender, child-friendly (Jolly Phonics style)
  gameBg: '#F5F3FF',
  gameBgAlt: '#EEEEF8',

  // Bright card/button gradients using new palette
  primaryPurple: `linear-gradient(135deg, #4F9DFF, #A78BFA)`,
  pinkHighlight: `linear-gradient(135deg, #FF9BD2, #FF7B7B)`,
  primarySecondary: `linear-gradient(135deg, #4F9DFF, #6ED6C1)`,
  greenSecondary: `linear-gradient(135deg, #7BD88F, #6ED6C1)`,
  pinkAccent: `linear-gradient(135deg, #FF9BD2, #FFD166)`,
  purplePink: `linear-gradient(135deg, #A78BFA, #FF9BD2)`,

  // Teacher portal sidebar
  sidebar: 'linear-gradient(180deg, #1F2937 0%, #374151 100%)',
} as const;

// Ordered list used for cycling homework/stat card colors (bright + kid-friendly)
export const cardGradients: { from: string; to: string }[] = [
  { from: '#F97316', to: '#FBBF24' }, // orange → yellow
  { from: '#EC4899', to: '#F472B6' }, // pink → light pink
  { from: '#8B5CF6', to: '#A78BFA' }, // violet → lavender
  { from: '#10B981', to: '#34D399' }, // emerald → mint
  { from: '#EF4444', to: '#F87171' }, // red → coral
  { from: '#06B6D4', to: '#67E8F9' }, // cyan → sky
];

export function scoreHexColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 50) return colors.accent;
  return colors.highlight;
}

export function timerHexColor(seconds: number): string {
  if (seconds <= 5) return colors.highlight;
  if (seconds <= 10) return colors.accent;
  return colors.purple;
}
