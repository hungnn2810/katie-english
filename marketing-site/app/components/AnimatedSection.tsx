'use client';
import { useRef, useState, useEffect } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  threshold?: number;
}

export default function AnimatedSection({ children, threshold }: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: threshold ?? 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}
    >
      {children}
    </div>
  );
}
