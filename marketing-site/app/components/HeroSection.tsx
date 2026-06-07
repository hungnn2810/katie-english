import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { MessageCircle } from 'lucide-react';

import { heroContent } from '../data/content';

export default function HeroSection() {
  return (
    <Box
      component="section"
      sx={{
        backgroundColor: '#E8F2FF',
        py: { xs: 4, md: 12 },
        px: { xs: 2, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <Typography variant="h1">{heroContent.tagline}</Typography>
              <Typography
                variant="body1"
                sx={{ mt: 2, color: 'text.secondary' }}
              >
                {heroContent.subheading}
              </Typography>
              <Box
                sx={{
                  mt: 4,
                  display: 'flex',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="contained"
                  href={heroContent.ctaHref}
                  component="a"
                  startIcon={<MessageCircle size={18} />}
                  sx={{
                    minHeight: 44,
                    backgroundColor: '#4F9DFF',
                  }}
                >
                  {heroContent.ctaLabel}
                </Button>
                <Button
                  variant="outlined"
                  href={heroContent.phoneHref}
                  component="a"
                  sx={{ minHeight: 44 }}
                >
                  {heroContent.phoneLabel}
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                background:
                  'linear-gradient(135deg, #4F9DFF 0%, #6ED6C1 100%)',
                borderRadius: 4,
                minHeight: { xs: 200, md: 360 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="white">
                Ảnh lớp học
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
