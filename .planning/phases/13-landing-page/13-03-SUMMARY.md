---
plan: "13-03"
phase: "13"
status: complete
self_check: PASSED
key-files:
  created:
    - marketing-site/app/components/SoftwareSection.tsx
    - marketing-site/app/components/ContactCTASection.tsx
  modified:
    - marketing-site/app/page.tsx
    - marketing-site/app/data/content.ts
    - marketing-site/package.json
---

## What Was Built

Bottom half of the landing page — Software section, CTA/Contact section, full 6-section page wiring, and local dev script.

**Approach deviation:** Files target `marketing-site/` (standalone Next.js static export) rather than `frontend/app/(marketing)/` route group. Route group was removed in commit `e2d5bb0` after 13-04 established the standalone approach.

**SoftwareSection.tsx** — Server component. Feature list (4 items) with CheckCircle2 icons (#4F9DFF). Platform screenshots via next/image with `priority={true}` on first image for LCP. h2 heading "Phần mềm hỗ trợ học tập" wrapped in AnimatedSection for scroll-triggered slideUp.

**ContactCTASection.tsx** — Server component using `component="footer"` (footer landmark). Full-width #4F9DFF background. Zalo button (min-height 44px, white bg, MessageCircle icon). Phone link as Typography h4 in white.

**page.tsx** — All 6 sections wired in order: Hero → TeacherProfile → StudentResults → Testimonials → Software → CTA. JSON-LD EducationalOrganization schema retained.

**content.ts** — Added softwareFeatures (4 items) and softwareScreenshots (2 items with width/height declared).

**dev script** — `marketing-site/package.json` has `"dev": "next dev -p 3004"` (equivalent to `dev:marketing` planned in route group approach).

## Human Verification

User verified: all 6 sections render correctly, scroll animations fire, carousel auto-advances, responsive layout works. **Approved.**

## Self-Check

- [x] SoftwareSection.tsx imports AnimatedSection, wraps h2 heading
- [x] SoftwareSection.tsx has `priority={true}` on first screenshot image
- [x] SoftwareSection.tsx imports CheckCircle2 from 'lucide-react'
- [x] softwareFeatures has 4 items; softwareScreenshots has 2 items
- [x] ContactCTASection.tsx uses component="footer" on root Box
- [x] ContactCTASection.tsx MessageCircle import, minHeight 44 on Zalo button
- [x] page.tsx renders all 6 sections in correct order
- [x] JSON-LD with "@type":"EducationalOrganization" present in page.tsx
- [x] marketing-site `npm run build` exits 0, generates out/index.html
- [x] No Tailwind class strings in any component
- [x] Human visual verification: approved
