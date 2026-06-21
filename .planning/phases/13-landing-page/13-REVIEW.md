---
phase: 13-landing-page
reviewed: 2026-06-08T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - frontend/app/sitemap.ts
  - frontend/app/robots.ts
  - frontend/middleware.ts
  - marketing-site/app/components/AnimatedSection.tsx
  - marketing-site/app/components/HeroSection.tsx
  - marketing-site/app/components/TeacherProfileSection.tsx
  - marketing-site/app/components/StudentResultsSection.tsx
  - marketing-site/app/components/StudentResultCard.tsx
  - marketing-site/app/components/TestimonialCarousel.tsx
  - marketing-site/app/components/TestimonialCard.tsx
  - marketing-site/app/data/content.ts
  - marketing-site/app/components/SoftwareSection.tsx
  - marketing-site/app/components/ContactCTASection.tsx
  - marketing-site/app/page.tsx
  - marketing-site/package.json
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

The marketing-site is a standalone Next.js static-export app and the frontend app now rewrites the root domain to a `/marketing` page. The implementation is largely coherent, but several blockers exist: placeholder contact data ships to production (breaking all CTAs), the middleware root-domain rewrite swallows every non-HTML asset path, the `dangerouslySetInnerHTML` JSON-LD block contains placeholder phone data that renders invalid structured data to search engines, and the carousel auto-advance has a division-by-zero crash path when the testimonials array is empty. Four additional warnings cover animation jank, inaccessible carousel dots, missing image error handling, and a package version mismatch.

---

## Critical Issues

### CR-01: Placeholder contact URLs ship to production — all CTAs are broken

**File:** `marketing-site/app/data/content.ts:5-7`

**Issue:** `ctaHref` is set to `'https://zalo.me/0000000000'` and `phoneHref` to `'tel:+84-000-000-0000'`. Both values are dummy placeholders. The Hero CTA button and the ContactCTA section both derive their `href` from `heroContent`, meaning every conversion action on the landing page sends users to a non-existent Zalo profile or dials a fake number. This will silently discard every lead from the moment the page goes live.

**Fix:**
```ts
export const heroContent = {
  tagline: 'Tiếng Anh tự tin — bắt đầu từ đây',
  subheading: 'Lớp tiếng Anh cô Katie — dành cho trẻ em 6–12 tuổi tại Hà Nội',
  ctaLabel: 'Nhắn tin Zalo ngay',
  ctaHref: 'https://zalo.me/<REAL_ZALO_ID>',   // replace before deploy
  phoneLabel: 'Gọi điện tư vấn',
  phoneHref: 'tel:+84-<REAL_PHONE>',            // replace before deploy
};
```
Add a CI lint rule or a runtime assertion (`if (ctaHref.includes('0000'))`) that throws during build to prevent placeholder values from reaching production.

---

### CR-02: JSON-LD structured data contains placeholder telephone — invalid schema published to search engines

**File:** `marketing-site/app/page.tsx:13`

**Issue:** The `jsonLd` object hardcodes `telephone: '+84-xxx-xxx-xxxx'`. Google Search Console will ingest this malformed telephone value and may penalise the schema markup, or the value will propagate into Google's knowledge graph with garbage data. This is a distinct issue from CR-01 because it lives in a separate constant and is injected via `dangerouslySetInnerHTML` regardless of the `heroContent` fix.

**Fix:**
```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Lớp Tiếng Anh Cô Katie',
  url: 'https://katie-english.com.vn',
  telephone: '+84-<REAL_PHONE>',   // must match heroContent.phoneHref
  address: { '@type': 'PostalAddress', addressLocality: 'Hà Nội', addressCountry: 'VN' },
  description: 'Lớp tiếng Anh cho trẻ 6-12 tuổi',
};
```
Derive the phone from a single source-of-truth constant shared with `heroContent` so they cannot diverge again.

---

### CR-03: Middleware root-domain rewrite swallows all asset requests — images, JS chunks, and CSS 404 in the frontend app

**File:** `frontend/middleware.ts:80-88`

**Issue:** When the root domain (`katie-english.com.vn` or `localhost`) is detected, the middleware rewrites **every** path to `/marketing`, with only `/sitemap.xml` and `/robots.txt` exempted. This means requests for paths like `/images/katie-avatar.jpg`, `/_next/static/...` JS chunks, and API calls to `/api/...` are all silently rewritten to the `/marketing` page. The matcher already exempts `_next/static` and `_next/image`, but it does **not** exempt `favicon.ico` assets other than the one at root, `/images/`, `/fonts/`, or `/api/` routes. Any API route served under the root domain will be unreachable.

The `/api/` passthrough guard (line 114) is unreachable for `subdomain === 'root'` because the root branch returns at line 87 before reaching that guard.

**Fix:**
```ts
if (subdomain === 'root') {
  // Allow SEO files, static assets, and API routes through unchanged
  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/')
  ) {
    return NextResponse.next();
  }
  const rewriteUrl = new URL('/marketing', req.url);
  return NextResponse.rewrite(rewriteUrl);
}
```
Alternatively, move the marketing content into the root Next.js app so middleware is not needed at all, which avoids this class of bugs.

---

### CR-04: `TestimonialCarousel` crashes with division-by-zero / `NaN` when `testimonials` array is empty

**File:** `marketing-site/app/components/TestimonialCarousel.tsx:18`

**Issue:** `(c + 1) % testimonials.length` evaluates to `NaN` when `testimonials.length === 0`, which causes `setCurrent(NaN)`. The `handlePrev` and `handleNext` functions have the same issue. This does not crash in the current build because the array has 6 entries, but the component has no guard, so any future content edit that accidentally empties the array will produce a broken carousel.

**Fix:**
```ts
useEffect(() => {
  if (paused || testimonials.length === 0) return;
  const t = setInterval(
    () => setCurrent((c) => (c + 1) % testimonials.length),
    5000
  );
  return () => clearInterval(t);
}, [paused]);

// Similarly guard nav handlers:
const handlePrev = () => {
  if (testimonials.length === 0) return;
  setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);
};
const handleNext = () => {
  if (testimonials.length === 0) return;
  setCurrent((c) => (c + 1) % testimonials.length);
};
```

---

## Warnings

### WR-01: `fadeIn` CSS animation is undefined — hero text flashes unstyled on load

**File:** `marketing-site/app/components/HeroSection.tsx:23`

**Issue:** `<Box style={{ animation: 'fadeIn 0.4s ease-out' }}>` references a keyframe named `fadeIn`. No `@keyframes fadeIn` is defined anywhere in the marketing-site source (no global CSS file was found). Browsers silently ignore undefined animation names, so the element renders immediately at full opacity with no transition, which is harmless but leaves the intended UX effect missing.

**Fix:** Define the keyframe in the MUI theme's `GlobalStyles` or a global CSS file:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Or replace the inline style with the same `AnimatedSection` wrapper used by other sections for consistency.

---

### WR-02: Carousel dot indicators are not keyboard accessible — inaccessible interactive elements

**File:** `marketing-site/app/components/TestimonialCarousel.tsx:101-117`

**Issue:** The pagination dots are plain `<Box>` elements (rendered as `<div>`) with an `onClick` handler. They have no `role`, no `aria-label`, no `tabIndex`, and are not focusable. Keyboard-only users and screen readers cannot navigate to individual testimonials via the dots. This is an accessibility regression even though a `role="region"` is correctly set on the outer container.

**Fix:**
```tsx
{testimonials.map((_, i) => (
  <Box
    key={i}
    component="button"
    onClick={() => setCurrent(i)}
    aria-label={`Đánh giá ${i + 1}`}
    aria-current={i === current ? 'true' : undefined}
    sx={{
      width: 10,
      height: 10,
      borderRadius: '50%',
      backgroundColor: i === current ? '#4F9DFF' : '#E2E8F0',
      cursor: 'pointer',
      minWidth: 32,
      minHeight: 32,
      border: 'none',
      padding: 0,
    }}
  />
))}
```

---

### WR-03: `next/image` used with static export but images have no fallback — broken image UX when files are absent

**File:** `marketing-site/app/components/TeacherProfileSection.tsx:41-55`

**Issue:** `TeacherProfileSection` correctly falls back to an `<Avatar>` when `teacherContent.imageSrc` is falsy. However, `teacherContent.imageSrc` is set to `'/images/katie-avatar.jpg'` (a non-empty string), so the `<Image>` path is always taken. If the image file is missing at deploy time, the Next.js static export will still produce a broken `<img>` tag rather than the fallback avatar. The conditional check on `imageSrc` truthiness does not protect against a file that exists in code but not on disk.

Similarly in `SoftwareSection.tsx:53-61`, both screenshot images (`/images/screenshot-teacher.png`, `/images/screenshot-student.png`) are referenced with hardcoded paths. There is no `onError` fallback.

**Fix:** Add `onError` handlers for graceful degradation, or verify image files exist in CI before static export:
```tsx
<Image
  src={teacherContent.imageSrc}
  width={200}
  height={200}
  alt={teacherContent.imageAlt}
  priority
  style={{ borderRadius: '50%', objectFit: 'cover' }}
  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
/>
```

---

### WR-04: Middleware `decodeJwtRole` result is silently discarded — dead auth code

**File:** `frontend/middleware.ts:134`

**Issue:** `decodeJwtRole(tokenValue)` is called but its return value is not used (`// decode but do not enforce here per D-04`). The function is imported and executed on every authenticated request, adding latency from base64 decoding and JSON parsing, yet the result is thrown away. The comment acknowledges this is intentional per a design decision, but this means **any token** — expired, signed for a wrong domain, or completely malformed (as long as it has 2+ dot-separated segments) — satisfies the auth check. A student cookie value copied to the admin subdomain will pass the middleware without any error.

This is specifically a concern because the comment says "Role mismatch → 403 shown by layout." If the layout guard is ever misconfigured, there is zero server-side enforcement.

**Fix:** Either remove the dead call entirely (and rely on layout guards, accepting the risk), or enforce the role in middleware:
```ts
const role = decodeJwtRole(tokenValue);
if (role !== subConfig.expectedRole) {
  return NextResponse.redirect(new URL(subConfig.loginPath, req.url));
}
return NextResponse.next();
```

---

### WR-05: `package.json` specifies `next: "^14.2.0"` but MUI v9 requires Next.js 15

**File:** `marketing-site/package.json:17`

**Issue:** `@mui/material` is pinned to `^9.0.1` and `@mui/material-nextjs` to `^9.0.1`. MUI v9 dropped support for Next.js 14; its peer dependency requires Next.js 15+. The declared `next: "^14.2.0"` is incompatible with MUI v9, meaning `npm install` will emit a peer-dependency warning and the build may rely on behavior that MUI v9 does not support on Next.js 14. This version mismatch can cause silent SSR hydration mismatches.

**Fix:**
```json
"next": "^15.0.0",
"react": "^19.0.0",
"react-dom": "^19.0.0"
```
Or downgrade MUI to v6 (`"@mui/material": "^6.0.0"`) which formally supports Next.js 14.

---

### WR-06: `AnimatedSection` starts invisible with no `prefers-reduced-motion` guard — accessibility failure

**File:** `marketing-site/app/components/AnimatedSection.tsx:26-30`

**Issue:** The component unconditionally starts at `opacity: 0` and transitions to `opacity: 1` on intersection. Users who have enabled `prefers-reduced-motion` in their OS settings will still see the fade/slide animation, violating WCAG 2.1 SC 2.3.3 (AAA) and the commonly-expected AA behaviour for motion. More critically, if JavaScript fails to load (static export, CDN edge error) or the `IntersectionObserver` fires but `setVisible(true)` is skipped (e.g., the element is removed before the callback fires), the content stays at `opacity: 0` and is permanently invisible.

**Fix:**
```tsx
useEffect(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    setVisible(true);
    return;
  }
  // ... IntersectionObserver setup
}, [threshold]);
```

---

## Info

### IN-01: All student result testimonials have rating 5 — data looks artificial

**File:** `marketing-site/app/data/content.ts:30-36`

**Issue:** All six testimonials carry `rating: 5`. Uniform perfect scores reduce credibility on a marketing page and may trigger distrust in prospective customers. This is not a code bug, but the rating data should reflect realistic variance.

**Fix:** Consider mixing in at least one 4-star testimonial, or remove the numeric rating display if all scores are always 5.

---

### IN-02: Hardcoded colour `#4F9DFF` appears 6+ times across components — should be a theme token

**File:** `marketing-site/app/components/HeroSection.tsx:46`, `TestimonialCard.tsx:40`, `TestimonialCarousel.tsx:109`, `SoftwareSection.tsx:37`, `ContactCTASection.tsx:13`, `StudentResultCard.tsx:54` (via `secondary.main`)

**Issue:** The brand blue `#4F9DFF` is copy-pasted directly rather than referenced through the MUI theme. If the brand colour changes, all occurrences must be manually updated.

**Fix:** Define it once in `lib/theme.ts`:
```ts
palette: {
  primary: { main: '#4F9DFF' },
}
```
Then replace hardcoded colour literals with `'primary.main'` in `sx` props.

---

### IN-03: `HeroSection` image placeholder is a lorem-ipsum text node in production build

**File:** `marketing-site/app/components/HeroSection.tsx:74`

**Issue:** The right column of the hero section renders `<Typography variant="body2" color="white">Ảnh lớp học</Typography>` ("Classroom photo") inside a gradient box as a placeholder. This text placeholder is present in the production static export (confirmed by `.next/` build artifacts) and is visible to real users.

**Fix:** Replace with an actual classroom photo using `<Image>` or remove the placeholder text and style the box as a decorative background until a real image is available:
```tsx
{/* Replace with: */}
<Image src="/images/classroom.jpg" fill alt="Lớp học tiếng Anh cô Katie" style={{ objectFit: 'cover', borderRadius: 16 }} />
```

---

_Reviewed: 2026-06-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
