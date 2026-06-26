import { Box, Typography } from '@mui/material';
import { Pencil } from 'lucide-react';
import React from 'react';

interface FormSectionProps {
  label: string;
  children: React.ReactNode;
  showPencil?: boolean;
  onClick?: () => void;
}

export default function FormSection({ label, children, showPencil = true, onClick }: FormSectionProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: '#F3F5FB',
        borderRadius: '14px',
        px: 2.5,
        pt: 1.75,
        pb: 2,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: '#EDF0F8' } : {},
        transition: 'background 0.15s',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', mb: 1, fontWeight: 500 }}>
          {label}
        </Typography>
        {children}
      </Box>
      {showPencil && (
        <Box sx={{ mt: 0.25, flexShrink: 0 }}>
          <Pencil size={15} color="#C4C9DC" />
        </Box>
      )}
    </Box>
  );
}
