import Alert from '@mui/material/Alert';

interface Props {
  isCorrect: boolean;
  correctAnswer: string[];
}

export default function ResultBanner({ isCorrect, correctAnswer }: Props) {
  return (
    <Alert
      severity={isCorrect ? 'success' : 'error'}
      sx={{ borderRadius: 4, textAlign: 'center', fontSize: '1.125rem', fontWeight: 600, '& .MuiAlert-message': { width: '100%' } }}
    >
      {isCorrect ? (
        'Correct! Well done!'
      ) : (
        <>Not quite. Correct answer: <strong>{correctAnswer.join(' - ')}</strong></>
      )}
    </Alert>
  );
}
