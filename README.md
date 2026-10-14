# Format-Box

A collection of small, focused web tools — formatters, converters, generators, and a few games — all accessible from one place. Most run entirely in the browser; a few fetch external data (fuel prices, gold prices, exchange rates, lottery results) through server routes.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** for the tool registry, feedback, and admin content
- **@tabler/icons-react** for all icons (no emoji / unicode icons)
- Default UI language: **Vietnamese** (English available), switchable at runtime

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

### Environment

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

If Supabase env vars are missing, the app falls back to the seed tool list in `lib/tools-shared.ts` and read/write features that need the DB are disabled.

## Scripts

- `pnpm dev` — dev server
- `pnpm dev:turbo` — dev server with Turbopack
- `pnpm build` — production build
- `pnpm start` — start production server
- `pnpm lint` — ESLint via `next lint`
- `pnpm clean` — remove `.next`, `tsconfig.tsbuildinfo`, and the node_modules cache

## Structure

```
app/
  layout.tsx           # Root layout, fonts, theme init, ToolsProvider
  globals.css          # Design tokens (CSS variables for light/dark)
  page.tsx             # Landing page
  {slug}/              # One directory per tool
    page.tsx           #   Server component — metadata + <ToolHeader> + <XxxTool>
    {Name}Tool.tsx     #   "use client" — all interactive logic
  api/                 # Server routes used by tools that need CORS workaround
  admin/               # Password-protected admin panel (tool toggles, feedback, podcasts)
components/
  ui/                  # Bespoke primitives built on CSS variables (Button, Input, Modal, ...)
  ToolHeader.tsx       # Shared title/subtitle from i18n keys
  Nav.tsx, Footer.tsx, ThemeToggle.tsx, Toast.tsx, ...
lib/
  tools-shared.ts      # SEED_TOOLS — canonical tool list + Supabase fallback
  tools.tsx            # Fetches active tools from Supabase, cached
  i18n.tsx             # Flat { vi, en } dict + useI18n() hook
  theme.ts             # Pre-hydration script to avoid theme flash
  supabase.ts          # supabase() / supabaseAdmin() clients
middleware.ts          # Admin auth + rewrites for inactive tools
supabase/schema.sql    # Database schema
apps-script/           # Google Apps Script helpers (external)
```

## Adding a tool

1. Add an entry to `SEED_TOOLS` in `lib/tools-shared.ts`.
2. Create `app/{slug}/page.tsx` (server component with metadata) and `app/{slug}/{Name}Tool.tsx` (`"use client"`).
3. Add the slug to the `matcher` array in `middleware.ts`.
4. Seed or toggle it in Supabase via `/admin/menu`.

## Conventions

- Keep tool UIs compact: multi-column grids, reduced padding/gap, result beside the input when possible rather than stacked below.
- All UI strings go through `useI18n()` — don't hardcode Vietnamese or English in components.
- Use CSS variables (`--bg`, `--text`, `--accent`, `--border`, `--ok`, `--warn`, `--err`, ...) for colors; both themes are defined in `app/globals.css`.
- Import UI primitives from `@/components/ui`. Icons from `@tabler/icons-react` only.
