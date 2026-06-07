import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

interface StudentResultCardProps {
  studentName: string;
  before: string;
  after: string;
  achievement: string;
  period: string;
}

export default function StudentResultCard({
  studentName,
  before,
  after,
  achievement,
  period,
}: StudentResultCardProps) {
  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="h3">{studentName}</Typography>
      <Chip label={`Sau ${period}`} size="small" sx={{ mt: 1, mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box>
          <Typography
            variant="caption"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Trước
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {before}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Sau
          </Typography>
          <Typography
            variant="body1"
            color="text.primary"
            sx={{ fontWeight: 700 }}
          >
            {after}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          backgroundColor: 'secondary.main',
          borderRadius: 2,
          px: 2,
          py: 1,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {achievement}
        </Typography>
      </Box>
    </Card>
  );
}
