import type { PhonemeOp } from '@/lib/admin-api';

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

const VARIANT_CLASSES: Record<Variant, string> = {
  correct: 'bg-green-100 text-green-800',
  similar: 'bg-yellow-100 text-yellow-800',
  wrong:   'bg-red-100 text-red-800',
  missing: 'border-2 border-dashed border-gray-400 text-gray-400 bg-transparent',
};

function labelFor(op: PhonemeOp): string {
  if (op.status === 'substituted' && op.expected && op.aligned) {
    return `${op.expected} -> ${op.aligned}`;
  }
  if (op.status === 'extra') {
    return op.aligned ?? '?';
  }
  // correct, similar, missing -> expected phoneme
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
    <div className="flex flex-wrap gap-1 mt-2" data-testid="phoneme-chips">
      {chips.map(({ op, variant, key }) => (
        <span
          key={key}
          className={`font-mono font-bold text-sm px-2 py-1 rounded ${VARIANT_CLASSES[variant]}`}
          data-status={op.status}
        >
          {labelFor(op)}
        </span>
      ))}
    </div>
  );
}

export default PhonemeChips;
