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
} as const;

export const gradients = {
  // Deep immersive bg for game/student screens (dark for good contrast + immersion)
  gameBg: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
  gameBgAlt: 'linear-gradient(135deg, #0F0C29, #1E1B4B, #312E81)',

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

// Ordered list used for cycling homework/stat card colors
export const cardGradients: { from: string; to: string }[] = [
  { from: colors.primary, to: colors.purple },
  { from: colors.pink, to: colors.highlight },
  { from: colors.primary, to: colors.secondary },
  { from: colors.green, to: colors.secondary },
  { from: colors.pink, to: colors.accent },
  { from: colors.purple, to: colors.pink },
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
