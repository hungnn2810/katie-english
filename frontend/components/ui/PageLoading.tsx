import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export const PAGE_LOADING_DELAY = 400;

export default function PageLoading() {
  return (
    <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
