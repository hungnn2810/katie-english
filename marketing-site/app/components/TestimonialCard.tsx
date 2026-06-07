import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface TestimonialCardProps {
  parentName: string;
  relation: string;
  quote: string;
  rating: number;
  initials: string;
}

export default function TestimonialCard({
  parentName,
  relation,
  quote,
  rating,
  initials,
}: TestimonialCardProps) {
  return (
    <Box sx={{ px: { xs: 2, md: 6 }, textAlign: 'center' }}>
      <Avatar
        sx={{
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          backgroundColor: 'primary.main',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        {initials}
      </Avatar>
      <Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Typography
            key={i}
            component="span"
            sx={{ color: i < rating ? '#4F9DFF' : 'divider' }}
          >
            ★
          </Typography>
        ))}
      </Box>
      <Typography
        variant="body1"
        sx={{ mt: 2, fontStyle: 'italic', color: 'text.primary' }}
      >
        &ldquo;{quote}&rdquo;
      </Typography>
      <Typography
        variant="caption"
        sx={{
          mt: 2,
          display: 'block',
          color: 'text.secondary',
          letterSpacing: '0.05em',
        }}
      >
        {parentName} — {relation}
      </Typography>
    </Box>
  );
}
