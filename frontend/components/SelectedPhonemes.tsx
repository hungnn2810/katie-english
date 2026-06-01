'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

interface Props {
  selected: string[];
  onRemove: (index: number) => void;
}

export default function SelectedPhonemes({ selected, onRemove }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, minHeight: '5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', p: 2, bgcolor: 'background.default', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
      {selected.length === 0 ? (
        <Typography variant="body2" color="text.secondary">Click phonemes to build a word</Typography>
      ) : (
        selected.map((symbol, i) => (
          <Button key={i} onClick={() => onRemove(i)} sx={{ width: 64, height: 64, minWidth: 64, bgcolor: 'primary.main', color: 'white', opacity: 0.8, borderRadius: 3, fontSize: '1.25rem', fontWeight: 700, border: '2px solid', borderColor: 'primary.main', '&:hover': { bgcolor: 'error.main', borderColor: 'error.main', opacity: 1 }, transition: 'all 0.15s' }} title="Remove">
            {symbol}
          </Button>
        ))
      )}
    </Box>
  );
}
