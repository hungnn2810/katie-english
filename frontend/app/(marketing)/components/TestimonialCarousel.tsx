'use client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TestimonialCard from './TestimonialCard';
import { testimonials } from '../data/content';

export default function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(
      () => setCurrent((c) => (c + 1) % testimonials.length),
      5000
    );
    return () => clearInterval(t);
  }, [paused]);

  const handlePrev = () =>
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
  const handleNext = () =>
    setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <Box
      component="section"
      role="region"
      aria-label="Đánh giá từ phụ huynh"
      sx={{ backgroundColor: 'background.default', py: { xs: 4, md: 8 } }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Container maxWidth="md">
        <Typography variant="h2" sx={{ textAlign: 'center', mb: 4 }}>
          Phụ huynh chia sẻ
        </Typography>
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <Box
            sx={{
              transform: `translateX(${-current * 100}%)`,
              transition: 'transform 0.5s ease-in-out',
              display: 'flex',
            }}
          >
            {testimonials.map((t) => (
              <Box key={t.id} sx={{ minWidth: '100%', flexShrink: 0 }}>
                <TestimonialCard
                  parentName={t.parentName}
                  relation={t.relation}
                  quote={t.quote}
                  rating={t.rating}
                  initials={t.initials}
                />
              </Box>
            ))}
          </Box>
          <IconButton
            aria-label="Testimonial trước"
            onClick={handlePrev}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            aria-label="Testimonial tiếp theo"
            onClick={handleNext}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            mt: 3,
          }}
        >
          {testimonials.map((_, i) => (
            <Box
              key={i}
              onClick={() => setCurrent(i)}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: i === current ? '#4F9DFF' : '#E2E8F0',
                cursor: 'pointer',
                minWidth: 32,
                minHeight: 32,
                display: 'flex',
                alignSelf: 'center',
              }}
            />
          ))}
        </Box>
      </Container>
    </Box>
  );
}
