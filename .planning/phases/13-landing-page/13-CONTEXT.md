# Phase 13: Landing Page - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Xây dựng marketing landing page tại katie.vn (root domain) — giới thiệu lớp tiếng Anh cô Katie cho phụ huynh học sinh. Trang tĩnh (static), tiếng Việt, deploy qua subdomain middleware của Phase 12. Không có backend mới, không CMS.

</domain>

<decisions>
## Implementation Decisions

### Deployment & Routing
- **D-01:** Serve tại root domain `katie.vn` — extend middleware Phase 12 để route root domain về landing page route mới.
- **D-02:** Nằm trong cùng Next.js app hiện tại (`frontend/`), thêm route `/` hoặc subdomain routing mới trong middleware.
- **D-03:** Không cần backend — toàn bộ content hardcode tĩnh.

### Language & Content
- **D-04:** 100% tiếng Việt.
- **D-05:** Content hardcode trực tiếp trong component/JSON files — không CMS, không API call.

### Sections (theo thứ tự từ trên xuống)
1. **Hero + Giới thiệu lớp** — Tagline, ảnh/illustration, mô tả ngắn lớp tiếng Anh cô Katie, lứa tuổi dạy, hình thức học.
2. **Profile giáo viên (cô Katie)** — Ảnh, kinh nghiệm, bằng cấp, phong cách dạy.
3. **Kết quả học sinh + đánh giá phụ huynh** — Before/after stories 2-3 học sinh cụ thể, điểm thi học kì, danh hiệu cuộc thi + testimonials carousel/slider từ phụ huynh.
4. **Giới thiệu phần mềm + CTA/Liên hệ** — Feature list + screenshots của platform + Zalo/SĐT contact.

### Student Results Display
- **D-06:** Before/after story format — 2-3 học sinh cụ thể với tiến bộ theo thời gian.
- **D-07:** Kèm theo điểm số thi học kì và danh hiệu đạt được ở các cuộc thi (VD: học sinh giỏi, giải cuộc thi tiếng Anh).
- **D-08:** Testimonials từ phụ huynh hiển thị dạng carousel/auto-slider (5-6 quotes, avatar tên + trích dẫn 2-3 câu).

### Software Section
- **D-09:** Feature list (bullet points) + screenshots thật của platform (teacher dashboard, student game).
- **D-10:** Nhấn mạnh: quản lý lớp, bài tập số, chấm điểm tự động.

### CTA
- **D-11:** Nút chính là Zalo chat link + hiển thị số điện thoại rõ ràng.

### Animation & Design
- **D-12:** Minimal animation — fade-in khi scroll. Không heavy animation.
- **D-13:** Màu chủ đạo xanh blue, giao diện tươi sáng phù hợp giáo dục.
- **D-14:** Responsive — desktop + mobile/tablet.

### SEO
- **D-15:** Next.js `metadata` object trong `layout.tsx` / `page.tsx` — `title`, `description`, `keywords`, `openGraph`, `twitter` card.
- **D-16:** `<title>` = "Lớp Tiếng Anh Cô Katie | Dạy Tiếng Anh Trẻ Em" (hoặc tương tự — planner quyết định copy cụ thể).
- **D-17:** OpenGraph tags đầy đủ để share lên Facebook/Zalo preview đẹp (og:image, og:title, og:description).
- **D-18:** `sitemap.xml` tự động qua `app/sitemap.ts` (Next.js built-in).
- **D-19:** `robots.txt` allow crawl landing page, disallow `/teacher`, `/student`, `/admin`, `/api`.
- **D-20:** Semantic HTML — dùng `<h1>` duy nhất, heading hierarchy đúng (`h2`/`h3`), `alt` text đầy đủ cho ảnh.
- **D-21:** Core Web Vitals — lazy load ảnh (`next/image`), không block render, LCP target < 2.5s.
- **D-22:** Structured data JSON-LD — `LocalBusiness` hoặc `EducationalOrganization` schema cho katie.vn.

### Claude's Discretion
- Layout cụ thể từng section (grid, flex, card style)
- Icon set chọn dùng
- Specific tailwind color palette trong range xanh blue
- Exact copy text cho meta title/description

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 12 — Subdomain Routing (extend để support katie.vn root)
- `frontend/middleware.ts` — Logic routing subdomain hiện tại; cần extend để handle root domain.
- `.planning/phases/12-multi-subdomain-split/` — Context và plans của Phase 12.

### Frontend Tech Stack
- `frontend/package.json` — Xác nhận Next.js version, tailwind, component libraries hiện có.
- `frontend/components.json` — shadcn/ui components đã install.
- `frontend/app/globals.css` — Global styles, CSS variables.

### Project Context
- `.planning/PROJECT.md` — Product overview, stack.
- `.planning/REQUIREMENTS.md` — Requirements matrix.

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/app/globals.css` — Tailwind base styles, có thể reuse CSS variables.
- shadcn/ui components (Button, Card) — đã install, dùng cho landing page components.
- `frontend/middleware.ts` — Subdomain routing logic cần extend để serve katie.vn root.

### Established Patterns
- App Router (Next.js 14) — tất cả routes đều theo App Router pattern (`app/` folder).
- Tailwind CSS — styling convention toàn bộ project.
- Phase 12 tạo 3 subdomains (admin.*, app.*, student.*) — cần add 4th case: root/marketing domain.

### Integration Points
- Middleware routing: thêm condition cho `katie.vn` (root) → route tới `/marketing` route mới.
- Screenshots của app: lấy từ teacher dashboard và student game routes hiện có.

</code_context>

<specifics>
## Specific Ideas

- **Student stories**: Có điểm thi học kì thật và danh hiệu cuộc thi — không phải số liệu giả. Content sẽ do cô Katie cung cấp.
- **Software screenshots**: Chụp từ app thật (teacher dashboard, student game interface).
- **Màu**: Xanh blue tươi sáng — education feel, không phải corporate blue tối.

</specifics>

<deferred>
## Deferred Ideas

- CMS/admin panel để cô Katie tự cập nhật nội dung — scope riêng nếu cần.
- Form đăng ký online với backend — hiện tại dùng Zalo/SĐT thay thế.
- Multilingual (EN/VI) — có thể add sau nếu cần.
~~SEO~~ — moved to scope (D-15 → D-22).

</deferred>

---

*Phase: 13-landing-page*
*Context gathered: 2026-06-07*
