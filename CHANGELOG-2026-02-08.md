# Session de travail WhereToEat - 7-8 Fevrier 2026

## Resume

Session de correction massive de bugs et d'implementation de nouvelles fonctionnalites sur le projet WhereToEat v2 (monorepo Express + React + PostgreSQL/Drizzle).

---

## 1. Implementation du plan initial

### Schema DB (`shared/schema.ts`)
- Ajout des colonnes `companyName` (text) et `registrationNumber` (text) a la table `restaurants`
- Migration appliquee via script ALTER TABLE direct (car `db:push` bloque par restriction reseau)

### Backend - Routes registrations (`server/routes/registrations.ts`)
- Ajout de `postalCode` et `city` au schema Zod de validation
- Les deux routes POST (`/with-account` et `/`) calculent maintenant `location = "${postalCode} ${city}"`
- `companyName` et `registrationNumber` sont passes a `createRestaurant()`

### Backend - Routes restaurants (`server/routes/restaurants.ts`)
- Ajout de `"companyName"` et `"registrationNumber"` au tableau `allowedFields` du PUT

### Backend - Upload (`server/routes/upload.ts`)
- Suppression de `requireAuth` du middleware POST pour permettre l'upload pendant l'inscription (nouveau compte)

### Frontend - Page inscription (`client/src/pages/RestaurateurRegister.tsx`)
- Header change : "BIENVENUE" / "DANS L'ESPACE DEDIE AUX RESTAURATEURS"
- Redirect des utilisateurs authentifies avec restaurants vers `/dashboard`
- Ajout des champs NPA (Code postal) et Ville dans le formulaire Step 2
- Validation mise a jour pour inclure postalCode et city
- `postalCode` et `city` envoyes dans les deux mutations (avec/sans compte)
- Ajout `useQueryClient` + `invalidateQueries` apres login pour eviter race condition

### Frontend - Parametres (`client/src/pages/Settings.tsx`)
- Ajout des states `companyNameValue` et `registrationNumberValue`
- Label "Registre du Commerce (RC)" remplace par "Nom de la societe"
- Inputs cables avec `value`/`onChange` au lieu de `defaultValue` hardcode
- `companyName`/`registrationNumber` ajoutes au type et a l'appel de `saveContactsMutation`

---

## 2. Bug critique : "API endpoint not found" apres login

### Cause
`Dashboard.tsx` ligne 89 : `window.location.href = apiUrl("/api/login")` redirige vers une route API inexistante au lieu de la page SPA `/login`.

### Race condition
Apres login sur la page inscription, le cache auth query n'etait pas mis a jour avant la navigation vers `/dashboard`. Le Dashboard pensait que l'utilisateur n'etait pas authentifie.

### Corrections
- **`Dashboard.tsx:89`** : `/api/login` remplace par `/login`
- **`RestaurateurRegister.tsx`** : Ajout de `await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })` avant navigation

---

## 3. Bug critique : Route `/api/my-restaurants` manquante

### Cause
La route etait definie comme `router.get("/my-restaurants")` dans restaurant routes monte a `/api/restaurants`, resultant en `/api/restaurants/my-restaurants`. Mais TOUT le frontend appelait `/api/my-restaurants`.

### Correction
Ajout de la route directement dans `server/index.ts` :
```js
app.get("/api/my-restaurants", requireAuth, async (req, res) => {
  const restaurants = await storage.getRestaurantsByOwner(req.userId);
  res.json(restaurants);
});
```

---

## 4. Bug massif : URLs frontend desynchronisees avec le backend

### Probleme
Toutes les URLs frontend pour les sous-ressources etaient incorrectes :

| Frontend (FAUX) | Backend (CORRECT) |
|---|---|
| `/api/restaurants/{id}/bookings` | `/api/bookings/restaurant/{id}` |
| `/api/restaurants/{id}/floor-plan` | `/api/floor-plans/restaurant/{id}` |
| `/api/restaurants/{id}/clients` | `/api/clients/restaurant/{id}` |
| `/api/restaurants/{id}/closed-days` | `/api/closed-days/restaurant/{id}` |
| `/api/restaurants/{id}/users` | `/api/team/restaurant/{id}` |
| `/api/owner/bookings` | `/api/bookings/owner` |

### Fichiers corriges (10 fichiers)
- `client/src/pages/Dashboard.tsx` - bookings URLs + invalidateQueries
- `client/src/pages/Assignments.tsx` - bookings + floor-plan URLs
- `client/src/pages/Calendar.tsx` - bookings + closed-days URLs
- `client/src/pages/Clients.tsx` - clients + bookings URLs
- `client/src/pages/NewBooking.tsx` - bookings + floor-plan URLs + POST owner
- `client/src/pages/Notifications.tsx` - bookings URLs
- `client/src/pages/Statistics.tsx` - bookings URLs
- `client/src/pages/Settings.tsx` - bookings + team/users URLs
- `client/src/components/dashboard/ReservationsManager.tsx` - bookings URLs
- `client/src/components/floor-plan/FloorPlanBuilder.tsx` - floor-plan URLs

---

## 5. Bug : Plan de salle - pas de feedback visuel

### Cause
`FloorPlanBuilder.tsx` utilisait `toast` de **sonner** mais l'app ne monte que le `<Toaster />` de **shadcn**. Les notifications `toast.success()` / `toast.error()` etaient invisibles.

### Correction
- Remplacement de `import { toast } from "sonner"` par `import { useToast } from "@/hooks/use-toast"`
- Appels changes : `toast.success(...)` -> `toast({ title: "..." })`

---

## 6. Login / Admin

### Corrections auth
- Ajout de `isAdmin` dans la reponse login (`server/routes/auth.ts`)
- Ajout redirect admin dans `Login.tsx` : si `loginData.user?.isAdmin` -> `/admin`
- Reset passwords pour `contact@guptascafe.ch` et `hello@wheretoeat.ch` (voir `.env`)

---

## 7. Favicon

- Copie de `favicon.jpg` (icone couverts rouge) depuis `C:\Users\cibkr\Documents\CODING\PROJETS\WHERETOEAT\`
- Place dans `client/public/favicon.jpg`
- `index.html` mis a jour : `<link rel="icon" type="image/jpeg" href="/favicon.jpg" />`

---

## Etat de la base de donnees

| Utilisateur | Role |
|---|---|
| `hello@wheretoeat.ch` | Admin |
| `contact@guptascafe.ch` | Owner |

| Restaurant | ID | Owner |
|---|---|---|
| GUPTAS CAFE | 2 | `contact@guptascafe.ch` |

**Note** : `progest@bluewin.ch` et JAFFLE n'existent PAS en base.
**Note** : Les mots de passe sont stockes dans le fichier `.env` local (non versionne).

---

## Deploiement

- **Hebergement** : Infomaniak (Node.js)
- **SFTP** : `scripts/deploy-infomaniak.mjs`
- **Build** : `npm run build` (Vite client + esbuild server)
- **Process** : build -> copie dist vers deploy -> SFTP upload -> restart sur dashboard Infomaniak
- **Production** : `https://wheretoeat.ch`

---

## 8. Admin - Modification mot de passe utilisateurs

### Backend (`server/routes/admin.ts`)
- Ajout route `PUT /users/:id/password`
- Validation longueur minimum 6 caracteres
- Hash bcrypt avant sauvegarde

### Frontend (`client/src/pages/Admin.tsx`)
- Ajout icone `KeyRound` par utilisateur pour ouvrir le dialog
- Dialog avec double saisie du mot de passe + toggle visibilite (Eye/EyeOff)
- Mutation `changePasswordMutation` vers `PUT /api/admin/users/:id/password`
- `autoComplete="off"` sur le champ recherche et `autoComplete="new-password"` sur les inputs password pour eviter l'autofill du navigateur

---

## 9. Synchronisation cache Notifications <-> Dashboard

### Probleme
Accepter/refuser une reservation depuis les Notifications ne mettait pas a jour la liste des reservations du Dashboard (et inversement).

### Cause
Les deux pages utilisent des query keys differentes :
- Notifications : `["/api/all-bookings-notifications"]`
- Dashboard : `["/api/all-bookings"]`

### Correction
- `Notifications.tsx` : ajout `invalidateQueries({ queryKey: ["/api/all-bookings"] })` dans onSuccess
- `Dashboard.tsx` : ajout `invalidateQueries({ queryKey: ["/api/all-bookings-notifications"] })` dans onSuccess

---

## 10. Widget de reservation - Mode embed

### Probleme
Le widget iframe (`?embed=true`) dans Settings affichait la page complete du restaurant (Navbar, hero, infos...) au lieu du formulaire seul.

### Correction (`client/src/pages/RestaurantDetail.tsx`)
- Detection du parametre `?embed=true` via `URLSearchParams`
- En mode embed : rendu uniquement du `BookingForm` (titre + formulaire, sans Navbar/hero/infos)
- Fonctionne pour integration sur site web, Taplink, Instagram link-in-bio, etc.

### Bug deploy decouvert
- Le script `build.ts` ecrit dans `dist/` mais `deploy-infomaniak.mjs` lit depuis `deploy/`
- Les precedents deploiements uploadaient des anciens assets
- Corrige en copiant `dist/` vers `deploy/` avant le deploy

---

## 11. Push GitHub

- Remote : `https://github.com/cibkris-ui/wheretoeat.git`
- Branche `master`

### Commits
- `07c8939` : "Fix API URL mismatches, registration flow, floor plan, and favicon"
- `67c7c54` : "Update changelog with GitHub push info and full API route mapping"

---

## Notes techniques importantes

- `db:push` ne fonctionne pas depuis le local (restriction IP PostgreSQL AWS)
- Migrations manuelles via scripts `.cjs` avec `pg` Pool directement
- Le `NODE_ENV` est hardcode a `"production"` par esbuild dans le bundle
- Le queryClient par defaut utilise `queryKey.join("/")` comme URL de fetch
- Tous les queryKeys qui servent d'URL doivent correspondre exactement aux routes backend

---

## Mapping complet des routes API

### Routes backend (server montage)

| Prefix | Fichier route | Exemples endpoints |
|---|---|---|
| `/api/auth` | `routes/auth.ts` | POST `/login`, `/register`, GET `/user`, `/check-email` |
| `/api/bookings` | `routes/bookings.ts` | POST `/`, `/owner`, GET `/restaurant/:id`, PATCH `/:id/status`, `/:id/arrival`, `/:id/departure`, `/:id/bill-requested`, `/:id/table` |
| `/api/clients` | `routes/clients.ts` | GET `/restaurant/:id`, `/:id` |
| `/api/closed-days` | `routes/closedDays.ts` | GET `/restaurant/:id`, POST `/restaurant/:id`, DELETE `/:id` |
| `/api/floor-plans` | `routes/floorPlans.ts` | GET `/restaurant/:id`, PUT `/restaurant/:id` |
| `/api/restaurants` | `routes/restaurants.ts` | POST `/`, GET `/my-restaurants`, PUT `/:id`, POST `/:id/claim` |
| `/api/team` | `routes/team.ts` | GET `/restaurant/:id`, POST `/restaurant/:id`, DELETE `/restaurant/:restaurantId/user/:userId` |
| `/api/upload` | `routes/upload.ts` | POST `/` |
| `/api/admin` | `routes/admin.ts` | (admin endpoints) |
| `/api/registrations` | `routes/registrations.ts` | POST `/`, `/with-account` |
| `/api/public` | `routes/public.ts` | (public endpoints) |
| `/api/google-places` | `routes/googlePlaces.ts` | (Google Places API) |

### Routes standalone (server/index.ts)
| Endpoint | Description |
|---|---|
| GET `/api/my-restaurants` | Shortcut - restaurants du proprietaire |
| GET `/api/restaurants` | Liste publique restaurants |
| GET `/api/restaurants/:id` | Detail restaurant public |
| GET `/api/cuisine-categories` | Categories de cuisine |
| GET `/api/logout` | Logout (lien HTML) |
