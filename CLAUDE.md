# WhereToEat v2

## Project Overview
Restaurant reservation platform. Monorepo with Express backend, React frontend, PostgreSQL database.

## Tech Stack
- **Backend**: Express.js + TypeScript, esbuild bundle
- **Frontend**: React + Vite, TanStack Query, Wouter routing, shadcn/ui components
- **Database**: PostgreSQL (AWS RDS) + Drizzle ORM
- **Hosting**: Infomaniak (Node.js), SFTP deploy

## Project Structure
```
wheretoeat-v2/
  shared/schema.ts       # Drizzle DB schema (single source of truth)
  server/
    index.ts             # Express app + standalone routes
    routes/              # Route modules (auth, bookings, clients, etc.)
    services/storage.ts  # Database access layer
    middleware/auth.ts    # requireAuth middleware
  client/
    src/pages/           # React pages (Dashboard, Settings, Clients, etc.)
    src/components/      # Shared components
    public/              # Static assets (favicon.jpg, resto3.jpg)
  scripts/
    build.ts             # Build script (Vite client + esbuild server)
    deploy-infomaniak.mjs # SFTP deployment
    env-loader.mjs       # Shared .env loader for scripts
```

## Key Commands
- `npm run build` — Build client + server to `dist/`
- `npm run dev` — Start dev server (port 5000)
- `npm run db:push` — Push schema changes (requires DB network access)

## Deployment
1. `npm run build`
2. Copy `dist/*` to `deploy/`
3. `node scripts/deploy-infomaniak.mjs`
4. Restart app on Infomaniak dashboard

**IMPORTANT**: Build outputs to `dist/`, deploy reads from `deploy/`. Always copy before deploying. Never commit `deploy/` folder.

## Conventions
- All credentials in `.env` (never hardcode, never commit)
- Toast notifications: use shadcn `useToast` hook, NOT sonner
- TanStack Query: `queryKey` array is used as fetch URL (`queryKey.join("/")`), keys MUST match backend routes exactly
- Backend routes are mounted at `/api/<resource>` (e.g. `/api/bookings`, `/api/clients`)
- Sub-resource routes: `/api/<resource>/restaurant/:id` (NOT `/api/restaurants/:id/<resource>`)
- Restaurant field updates use `allowedFields` whitelist in `server/routes/restaurants.ts`
- Location format: `"postalCode city"` (e.g. `"1201 Geneve"`)
- Language: French UI, French error messages

## API Route Prefixes
| Prefix | File |
|--------|------|
| `/api/auth` | `routes/auth.ts` |
| `/api/bookings` | `routes/bookings.ts` |
| `/api/clients` | `routes/clients.ts` |
| `/api/closed-days` | `routes/closedDays.ts` |
| `/api/floor-plans` | `routes/floorPlans.ts` |
| `/api/restaurants` | `routes/restaurants.ts` |
| `/api/team` | `routes/team.ts` |
| `/api/upload` | `routes/upload.ts` |
| `/api/admin` | `routes/admin.ts` |
| `/api/registrations` | `routes/registrations.ts` |
| `/api/my-restaurants` | standalone in `server/index.ts` |

## Database
- Schema changes: edit `shared/schema.ts`, then migrate via ALTER TABLE scripts (db:push blocked by IP restriction)
- Booking stats exclude `cancelled` and `noshow` statuses
- Client deduplication by email (case-insensitive)

## SEO (implemented 2026-02-10)

### Meta tags (`client/index.html`)
- `<title>`, `<meta description>`, `<meta robots>`, `<meta theme-color>`
- Open Graph: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `<link rel="canonical">`

### Dynamic `document.title` per page
- Home: `WHERETOEAT.CH - Réservez les meilleurs restaurants de Suisse`
- About: `À propos - WHERETOEAT.CH`
- Restaurants: `Restaurants - WHERETOEAT.CH`
- RestaurantDetail: `{name} - Restaurant à {city} | WHERETOEAT.CH`
- RestaurateurRegister: `Inscrire mon restaurant - WHERETOEAT.CH`

### JSON-LD Structured Data (`RestaurantDetail.tsx`)
- Schema.org `Restaurant` type injected via `useEffect`
- Fields: name, image, address, telephone, servesCuisine, priceRange, url

### Server-side routes (`server/index.ts`)
- `GET /robots.txt` — allows `/`, disallows `/dashboard`, `/admin`, `/login`, `/api`, links sitemap
- `GET /sitemap.xml` — dynamic, lists static pages + all approved restaurants
- Both routes are defined BEFORE the rate limiter middleware

### Server-side meta injection (SPA catch-all)
- `/restaurant/:id` URLs: reads restaurant from DB, replaces OG/Twitter/title/description/canonical in HTML
- Crawlers (Google, Facebook, WhatsApp) see correct restaurant name + image without JS execution
- Falls through to default `index.html` if restaurant not found

## Known Constraints
- `db:push` fails from local IP (AWS RDS restriction) — use manual ALTER TABLE scripts
- `NODE_ENV` is hardcoded to `"production"` by esbuild in the bundle
- Large pages (Settings.tsx ~1400+ lines) — use offset/limit when reading
