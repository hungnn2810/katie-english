import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { MessageCircle } from 'lucide-react';
import { heroContent } from '../data/content';

export default function ContactCTASection() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#4F9DFF',
        py: { xs: 6, md: 8 },
        px: { xs: 2, md: 6 },
        textAlign: 'center',
      }}
    >
      <Container maxWidth="md">
        <Typography variant="h2" sx={{ color: '#FFFFFF', mb: 1 }}>
          Đăng ký học thử miễn phí
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.85)', mb: 4 }}
        >
          Liên hệ cô Katie để được tư vấn miễn phí và sắp xếp buổi học thử.
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Button
            variant="contained"
            component="a"
            href={heroContent.ctaHref}
            startIcon={<MessageCircle size={18} />}
            sx={{
              backgroundColor: '#FFFFFF',
              color: '#4F9DFF',
              minHeight: 44,
              fontWeight: 700,
              '&:hover': { backgroundColor: '#F0F4FF' },
            }}
          >
            Nhắn tin Zalo ngay
          </Button>
          <Typography
            variant="h4"
            component="a"
            href={heroContent.phoneHref}
            sx={{
              color: '#FFFFFF',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {heroContent.phoneLabel}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
