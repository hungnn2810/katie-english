import type { PhonemeOp } from '@/lib/admin-api';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

type Variant = 'correct' | 'similar' | 'wrong' | 'missing';

function variantFor(status: PhonemeOp['status']): Variant | null {
  switch (status) {
    case 'correct': return 'correct';
    case 'similar': return 'similar';
    case 'substituted':
    case 'extra':
      return 'wrong';
    case 'missing': return 'missing';
    case 'error':
    default:
      return null;
  }
}

const VARIANT_SX: Record<Variant, object> = {
  correct: { bgcolor: '#dcfce7', color: '#166534' },
  similar: { bgcolor: '#fef9c3', color: '#854d0e' },
  wrong:   { bgcolor: '#fee2e2', color: '#991b1b' },
  missing: { border: '2px dashed #9ca3af', color: '#9ca3af', bgcolor: 'transparent' },
};

function labelFor(op: PhonemeOp): string {
  if (op.status === 'substituted' && op.expected && op.aligned && op.expected !== op.aligned) {
    return `${op.expected} -> ${op.aligned}`;
  }
  if (op.status === 'extra') {
    return op.aligned ?? '?';
  }
  return op.expected ?? op.aligned ?? '?';
}

interface PhonemeChipsProps {
  feedback: PhonemeOp[];
}

export function PhonemeChips({ feedback }: PhonemeChipsProps) {
  const chips = feedback
    .map((op, i) => ({ op, variant: variantFor(op.status), key: i }))
    .filter((c): c is { op: PhonemeOp; variant: Variant; key: number } => c.variant !== null);

  if (chips.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 }, mt: 1 }} data-testid="phoneme-chips">
      {chips.map(({ op, variant, key }) => (
        <Chip
          key={key}
          label={labelFor(op)}
          size="small"
          sx={{ fontFamily: 'monospace', fontWeight: 700, ...VARIANT_SX[variant] }}
          data-status={op.status}
        />
      ))}
    </Box>
  );
}

export default PhonemeChips;
