---
plan: "13-02"
phase: "13"
status: complete
self_check: PASSED
key-files:
  created:
    - marketing-site/app/components/AnimatedSection.tsx
    - marketing-site/app/components/HeroSection.tsx
    - marketing-site/app/components/TeacherProfileSection.tsx
    - marketing-site/app/components/StudentResultsSection.tsx
    - marketing-site/app/components/StudentResultCard.tsx
    - marketing-site/app/components/TestimonialCarousel.tsx
    - marketing-site/app/components/TestimonialCard.tsx
    - marketing-site/app/data/content.ts
---

## What Was Built

Top half of the landing page — AnimatedSection scroll wrapper, Hero, Teacher Profile, Student Results, and Testimonials carousel.

**Approach deviation:** Components were originally built in `frontend/app/(marketing)/` (route group), then migrated to the standalone `marketing-site/` project during plan 13-04. The route group was removed (`chore(13): remove (marketing) route group`). Final implementations live in `marketing-site/app/components/`.

**AnimatedSection.tsx** — Client component using IntersectionObserver to trigger slideUp animation on scroll into viewport. Fires once per element.

**content.ts** — Exports heroContent, teacherContent, studentResults (3 entries), testimonials (5+ entries) as hardcoded Vietnamese data.

**HeroSection.tsx** — Server component with two-column layout, Vietnamese tagline "Tiếng Anh tự tin — bắt đầu từ đây", blue gradient visual (#E8F2FF → #4F9DFF/#6ED6C1), Zalo CTA button. Uses fadeIn on mount (not AnimatedSection).

**TeacherProfileSection.tsx** — Server component with centered card, next/image avatar (priority={true} for LCP), credentials list with CheckCircle2 icons. h2 heading wrapped in AnimatedSection.

**StudentResultsSection.tsx + StudentResultCard.tsx** — Server components rendering 3 before/after score cards in Grid2. Section h2 wrapped in AnimatedSection.

**TestimonialCarousel.tsx + TestimonialCard.tsx** — Client component with auto-advance (5s), prev/next arrow buttons with aria-labels in Vietnamese, dot indicators, pause on hover/focus, translate-based sliding.

## Self-Check

- [x] All 7 components exist in marketing-site/app/components/
- [x] AnimatedSection uses IntersectionObserver (not CSS-only)
- [x] content.ts exports heroContent, teacherContent, studentResults, testimonials
- [x] testimonials array has 5+ entries
- [x] TeacherProfileSection uses priority={true} on next/image (LCP)
- [x] TestimonialCarousel has role="region" and aria-labels in Vietnamese
- [x] No Tailwind class strings in any component
- [x] marketing-site `npm run build` exits 0
