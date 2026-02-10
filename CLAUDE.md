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

## Known Constraints
- `db:push` fails from local IP (AWS RDS restriction) — use manual ALTER TABLE scripts
- `NODE_ENV` is hardcoded to `"production"` by esbuild in the bundle
- Large pages (Settings.tsx ~1400+ lines) — use offset/limit when reading
