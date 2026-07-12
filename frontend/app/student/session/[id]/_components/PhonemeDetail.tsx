'use client';
import type { PhonemeOp } from '@/lib/admin-api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { phoneLabel, phoneExample, isHighlightPhoneme } from '@/lib/phoneme-map';

function posLabel(idx: number, total: number): string {
  if (total <= 1) return '';
  if (idx === 0) return ' ở đầu từ';
  if (idx === total - 1) return ' ở cuối từ';
  return ' ở giữa từ';
}

function chipLabel(op: PhonemeOp): string {
  const exp = phoneLabel(op.expected);
  if (op.status === 'substituted' && op.aligned) return `${exp} → ${phoneLabel(op.aligned)}`;
  if (op.status === 'extra' && op.aligned) return `+${phoneLabel(op.aligned)}`;
  if (op.status === 'missing') return `(${exp})`;
  return exp;
}

function issueText(op: PhonemeOp, idx: number, total: number): string {
  const pos = posLabel(idx, total);
  const exp = phoneLabel(op.expected);
  const expEx = phoneExample(op.expected);
  const expStr = expEx ? `"${exp}" (vd: "${expEx}")` : `"${exp}"`;

  if (op.status === 'substituted' && op.aligned) {
    const alt = phoneLabel(op.aligned);
    const altEx = phoneExample(op.aligned);
    const altStr = altEx ? `"${alt}" (vd: "${altEx}")` : `"${alt}"`;
    return `Âm ${expStr}${pos} — em đang đọc thành ${altStr}`;
  }
  if (op.status === 'missing') return `Âm ${expStr}${pos} — em bỏ qua âm này`;
  if (op.status === 'extra' && op.aligned) {
    const alt = phoneLabel(op.aligned);
    const altEx = phoneExample(op.aligned);
    const altStr = altEx ? `"${alt}" (vd: "${altEx}")` : `"${alt}"`;
    return `Em thêm thừa âm ${altStr}${pos}`;
  }
  if (op.status === 'similar') {
    return `Âm ${expStr}${pos} — cần phát âm rõ hơn`;
  }
  return '';
}

const STATUS_SX: Record<string, object> = {
  correct:     { bgcolor: '#dcfce7', color: '#166534' },
  similar:     { bgcolor: '#fef9c3', color: '#854d0e' },
  substituted: { bgcolor: '#fee2e2', color: '#991b1b' },
  extra:       { bgcolor: '#fee2e2', color: '#991b1b' },
  missing:     { bgcolor: 'transparent', color: '#9ca3af', border: '2px dashed #9ca3af' },
  error:       { bgcolor: '#f3f4f6', color: '#6b7280' },
};

interface PhonemeDetailProps {
  feedback: PhonemeOp[];
  highlight?: string;
}

export default function PhonemeDetail({ feedback, highlight }: PhonemeDetailProps) {
  const visible = feedback
    .filter((op) => op.status !== 'error')
    .map((op, i) => ({ op, i }));

  if (visible.length === 0) return null;

  const total = visible.length;
  const issues = visible.filter(({ op }) => op.status !== 'correct');
  const correctCount = total - issues.length;

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Phoneme chip row */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: issues.length > 0 ? 1.25 : 0.5 }}>
        {visible.map(({ op, i }) => {
          const ipa = op.expected ?? op.aligned;
          const isTarget = isHighlightPhoneme(ipa, highlight);
          return (
            <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              {isTarget && (
                <Typography sx={{ fontSize: 9, color: '#7c3aed', fontWeight: 700, lineHeight: 1, letterSpacing: '0.03em' }}>
                  🎯 luyện
                </Typography>
              )}
              <Chip
                label={chipLabel(op)}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: 12,
                  height: 26,
                  ...(STATUS_SX[op.status] ?? STATUS_SX.error),
                  ...(isTarget && op.status !== 'correct'
                    ? { outline: '2px solid #7c3aed', outlineOffset: 1 }
                    : {}),
                }}
              />
            </Box>
          );
        })}
      </Box>

      {/* Detail box */}
      {issues.length > 0 ? (
        <Box sx={{ bgcolor: '#fafafa', borderRadius: 2, px: 1.5, py: 1, border: '1px solid #f0f0f0' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#991b1b', mb: 0.75 }}>
            Đúng {correctCount}/{total} âm — cần luyện thêm:
          </Typography>
          {issues.map(({ op, i }, idx) => {
            const text = issueText(op, i, total);
            if (!text) return null;
            const ipa = op.expected ?? op.aligned;
            const isTarget = isHighlightPhoneme(ipa, highlight);
            return (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: idx < issues.length - 1 ? 0.5 : 0 }}>
                <Typography component="span" sx={{ fontSize: 12, color: isTarget ? '#7c3aed' : '#ef4444', flexShrink: 0, mt: '1px' }}>•</Typography>
                <Typography sx={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}>
                  {isTarget && (
                    <Box component="span" sx={{ color: '#7c3aed', fontWeight: 700, mr: 0.5 }}>[Âm đang luyện]</Box>
                  )}
                  {text}
                </Typography>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
          ✓ Đúng tất cả {total} âm
        </Typography>
      )}
    </Box>
  );
}
