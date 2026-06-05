import { Box, Card, Typography } from '@mui/material';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}

export default function StatCard({ icon: Icon, value, label, color, bgColor }: StatCardProps) {
  return (
    <Card
      sx={{
        padding: '22px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(15,23,42,0.10)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 2.25,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={color} />
        </Box>
        <ArrowRight size={16} color="#94A3B8" />
      </Box>
      <Typography
        sx={{
          fontSize: 30,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color,
          mb: 0.5,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: 14,
          color: '#64748B',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Card>
  );
}
