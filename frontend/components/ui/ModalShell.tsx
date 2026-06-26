import { Box, Dialog, DialogActions, DialogContent, IconButton, Typography } from '@mui/material';
import { CheckCircle, X } from 'lucide-react';
import React from 'react';

interface ModalShellProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  open?: boolean;
  actions?: React.ReactNode;
  submitLabel?: string;
  onSubmit?: React.FormEventHandler;
  loading?: boolean;
}

/** Borderless input style for TextFields inside a FormSection card */
export const sectionInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'white',
    borderRadius: '8px',
    '& fieldset': { borderColor: 'transparent' },
    '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.15)' },
    '&.Mui-focused fieldset': { borderColor: '#3B82F6', borderWidth: '1.5px' },
  },
};

export default function ModalShell({
  title,
  onClose,
  children,
  maxWidth = 'sm',
  open = true,
  actions,
  submitLabel,
  onSubmit,
  loading,
}: ModalShellProps) {
  const inner = (
    <>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3.5, pt: 3, pb: 2.5 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#1A1A2E', letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ bgcolor: '#F0F2F8', borderRadius: '50%', width: 32, height: 32, '&:hover': { bgcolor: '#E5E8F2' } }}
        >
          <X size={15} color="#6B7280" />
        </IconButton>
      </Box>

      {/* Body */}
      <DialogContent sx={{ px: 3.5, py: 0, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {children}
      </DialogContent>

      {/* Footer */}
      {(actions !== undefined || submitLabel) && (
        <DialogActions sx={{ px: 3.5, pb: 3, pt: 0.5, justifyContent: 'flex-end' }}>
          {actions ?? (
            <Box
              component="button"
              type="submit"
              disabled={loading}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                bgcolor: '#E8ECF6', color: '#6B7280',
                border: 'none', borderRadius: '50px',
                px: 3, py: 1.25,
                fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                '&:hover': { bgcolor: '#DDE2F0' },
                transition: 'all 0.15s',
              }}
            >
              <CheckCircle size={16} />
              {submitLabel}
            </Box>
          )}
        </DialogActions>
      )}
    </>
  );

  const content = onSubmit ? (
    <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column' }}>
      {inner}
    </Box>
  ) : inner;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)', maxHeight: '92vh' } } }}
    >
      {content}
    </Dialog>
  );
}
