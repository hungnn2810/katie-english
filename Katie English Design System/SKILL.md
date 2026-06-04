---
name: katie-english-design
description: Use this skill to generate well-branded interfaces and assets for Katie English, the Vietnamese primary-school English phonics homework platform — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, and UI kit components for the Student game portal, Teacher portal, and Admin portal.
user-invocable: true
---

# Katie English — design skill

Read `README.md` in this skill first — it carries the full product context, content
fundamentals (the two voices: warm Vietnamese for kids, concise English for staff),
visual foundations, and iconography. Then explore the other files as needed:

- `colors_and_type.css` — CSS variables for the whole color, gradient, type, radii, shadow and spacing system. Copy these into any artifact.
- `preview/` — visual reference cards for every token and component.
- `ui_kits/teacher/`, `ui_kits/admin/`, `ui_kits/student/` — React (Babel) recreations of each portal. `index.html` is a working click-through; `ui.jsx` + `screens.jsx` hold reusable components. Lift these for mocks.

## How to work

- **Three portals, three registers.** Match the audience: Student = wine-purple game stage, full-gradient floating cards, 900-weight type, big touch targets, Vietnamese, mobile-first. Teacher = light productivity app, dark sidebar, orange-red accent, English. Admin = same shell, blue accent, denser tables.
- **Fonts:** Inter (Google Fonts). **Icons:** Lucide, 2px stroke (CDN in mocks; `lucide-react` in production). No emoji as UI. The logo is a CSS "K" monogram, recolored per portal — there are no image assets.
- For visual artifacts (slides, mocks, throwaway prototypes), copy assets out and produce static HTML for the user to view.
- For production code, the source app is Next.js 14 + MUI v9 — read the rules here and the imported `frontend/` reference to design accurately.

If invoked with no other guidance, ask what the user wants to build and which portal it's
for, ask a few focused questions, then act as an expert designer outputting HTML artifacts
or production-ready guidance.
