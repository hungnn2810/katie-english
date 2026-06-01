'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

interface Props {
  symbol: string;
  audioUrl: string;
  selected: boolean;
  onClick: () => void;
}

export default function PhonemeButton({ symbol, audioUrl, selected, onClick }: Props) {
  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
  };

  return (
    <Button
      onClick={onClick}
      sx={{
        position: 'relative',
        width: 80,
        height: 80,
        minWidth: 80,
        borderRadius: 4,
        fontSize: '1.5rem',
        fontWeight: 700,
        border: '2px solid',
        transition: 'all 0.15s',
        userSelect: 'none',
        ...(selected
          ? {
              bgcolor: 'primary.main',
              color: 'white',
              borderColor: '#3B8AEA',
              transform: 'scale(0.95)',
            }
          : {
              bgcolor: 'white',
              color: 'primary.main',
              borderColor: 'primary.light',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
              boxShadow: 3,
            }),
      }}
    >
      {symbol}
      <Box
        component="button"
        onClick={playAudio}
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 24,
          height: 24,
          bgcolor: 'warning.main',
          borderRadius: '50%',
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          '&:hover': { bgcolor: '#F5C040' },
          boxShadow: 1,
        }}
        title="Play sound"
      >
        ▶
      </Box>
    </Button>
  );
}
