'use client';
import Box from '@mui/material/Box';
import React, { useRef, useState, useEffect } from 'react';
import { slideUp } from '@/lib/theme';

interface AnimatedSectionProps {
  children: React.ReactNode;
  threshold?: number;
}

export default function AnimatedSection({ children, threshold }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: threshold ?? 0.15 }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <Box
      ref={ref}
      sx={
        isVisible
          ? { animation: `${slideUp} 0.3s ease-out both` }
          : { opacity: 0 }
      }
    >
      {children}
    </Box>
  );
}
