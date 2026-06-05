import { Chip } from '@mui/material';
import type { LucideProps } from 'lucide-react';
import { BookOpen, Hash, Headphones, ImageIcon, Mic } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

type HwType = 'PHONICS' | 'SPEAKING' | 'VOCABULARY' | 'LISTEN' | 'READING';

interface HwTypeChipProps {
  type: HwType;
}

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const CONFIG: Record<HwType, { label: string; bg: string; color: string; Icon: LucideIcon }> = {
  PHONICS:    { label: 'Phonics',    bg: '#FFF7ED', color: '#F97316', Icon: Hash },
  SPEAKING:   { label: 'Speaking',   bg: '#FDF2F8', color: '#EC4899', Icon: Mic },
  VOCABULARY: { label: 'Vocabulary', bg: '#F5F3FF', color: '#8B5CF6', Icon: ImageIcon },
  LISTEN:     { label: 'Listen',     bg: '#ECFEFF', color: '#06B6D4', Icon: Headphones },
  READING:    { label: 'Reading',    bg: '#F0FDF4', color: '#16A34A', Icon: BookOpen },
};

export default function HwTypeChip({ type }: HwTypeChipProps) {
  const config = CONFIG[type];
  return (
    <Chip
      label={config.label}
      icon={<config.Icon size={12} color={config.color} />}
      sx={{
        borderRadius: '999px',
        fontWeight: 700,
        fontSize: 12,
        bgcolor: config.bg,
        color: config.color,
        '& .MuiChip-icon': {
          color: config.color,
          marginLeft: '8px',
        },
      }}
    />
  );
}
