# FormatBox

Data-conversion tools that run entirely in the browser — Base64, JSON, and images. No upload, no signup.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- 100% client-side. No API routes, no backend.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

```
app/
  layout.tsx        # Root layout, fonts, theme init
  globals.css       # Design tokens + component styles (CSS variables, theme-aware)
  page.tsx          # Landing page
  base64/           # Base64 tool (page + client component)
  json/             # JSON formatter/validator
  image/            # Image converter
components/
  Nav.tsx           # Top nav
  Footer.tsx
  Logo.tsx
  ThemeToggle.tsx   # Dark/light toggle, persists to localStorage
  Toast.tsx         # Toast context
  LiveDemo.tsx      # Base64 live demo on landing
lib/
  theme.ts          # Pre-hydration script to avoid theme flash
legacy/             # Original standalone HTML (pre-migration)
```

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm start` — start production server
- `npm run lint` — lint
