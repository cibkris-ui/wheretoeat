# WHERETOEAT.CH - Restaurant Booking Platform

## Overview

WHERETOEAT.CH is a restaurant discovery and table booking platform for Switzerland, inspired by TheFork. Users can browse restaurants, view details, and make real-time table reservations. The application features a French-language interface with Swiss-focused restaurant listings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a page-based structure with reusable components. Key pages include Home (restaurant listing with search) and RestaurantDetail (individual restaurant with booking form).

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON API under `/api` prefix

The server handles restaurant CRUD operations and booking management. In development, Vite middleware serves the frontend with HMR support. In production, static files are served from the built `dist/public` directory.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)

Database tables:
- `users` - User authentication (id, username, password)
- `restaurants` - Restaurant listings (name, cuisine, location, rating, price range, image, description, features)
- `bookings` - Table reservations (restaurant reference, date, time, guests, contact info)

### API Structure
- `GET /api/restaurants` - List all restaurants
- `GET /api/restaurants/:id` - Get single restaurant
- `POST /api/restaurants` - Create restaurant
- `POST /api/bookings` - Create booking
- `GET /api/bookings/restaurant/:id` - Get bookings for restaurant

### Key Design Decisions

**Monorepo Structure**: Client, server, and shared code in one repository with path aliases (`@/` for client, `@shared/` for shared code). This enables type sharing between frontend and backend.

**Shared Schema**: Drizzle schema in `shared/schema.ts` generates both database types and Zod validation schemas, ensuring type safety across the full stack.

**Component Library**: shadcn/ui provides accessible, customizable components. The `components.json` configures the New York style variant with Lucide icons.

**Multi-step Booking Form**: The booking flow uses a wizard pattern with date, time, guests, and contact details steps for better UX.

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Connection pooling with `pg` driver
- Session storage with `connect-pg-simple`

### Frontend Libraries
- Radix UI primitives for accessible components
- Embla Carousel for image carousels
- date-fns for date formatting (French locale support)
- cmdk for command palette functionality

### Development Tools
- Drizzle Kit for database migrations (`npm run db:push`)
- esbuild for production server bundling
- Custom Vite plugins for Replit integration (cartographer, dev-banner, meta-images)

### Fonts
- Google Fonts: DM Serif Display (headers), Inter (UI text)

## Interface TheFork Manager (Phase 1 - Terminée)

### Dashboard restaurateur (/dashboard)
- **Sidebar verticale verte** avec icônes: Réservations, Calendrier, Recherche, Statistiques, Paramètres, Notifications, Déconnexion
- **Page Réservations**: Navigation par date, sélecteur de service (Lunch/Dinner), filtres (Actifs, En cours de service, À venir), barre de recherche, liste des réservations en tableau
- **Vue Calendrier mensuel**: Affichage Lunch/Dinner par jour avec nombre de couverts, navigation par mois, dimanches marqués "Fermé"
- **Section Statistiques**: Vue d'ensemble avec couverts totaux, annulations tardives, no-shows
- **Section Paramètres**: Cartes pour profil restaurant, services, utilisateurs, module de réservation

### Nouvelle réservation (/dashboard/nouvelle-reservation)
- **Calendrier français** avec navigation par mois, jours de la semaine en français
- **Sélecteur d'heure par service** (Lunch/Dinner) avec affichage capacité réservée/totale par créneau
- **Créneaux pleins désactivés** automatiquement
- **Sélecteur de durée dynamique** affichant l'heure de fin estimée
- **Formulaire client** avec champs obligatoires, sélecteur de pays téléphone (+41, +33, +49, +39)
- **Tags client** (VIP, Habitué, Standard, Occasionnel)

### Support multi-restaurants
- Sélecteur "Tous les restaurants" pour comptes multi-établissements
- Affichage nom restaurant pour comptes mono-établissement
- Agrégation des réservations dans les vues globales

## Fonctionnalités à ajouter

### Emails (en attente de clé API Resend)
- Email de confirmation envoyé au client quand le restaurateur valide une réservation
- Email de rappel envoyé le matin de chaque réservation
- Service recommandé: Resend (resend.com) - gratuit jusqu'à 3000 emails/mois

## Intégrations externes

### Google Places API (en attente de clé API)
- Affichage des notes Google sur les pages restaurant
- Affichage des avis Google récents
- Variable d'environnement requise: GOOGLE_PLACES_API_KEY
- Champ googlePlaceId ajouté à la table restaurants
- Routes API: GET /api/google-places/configured, /api/google-places/search, /api/google-places/:placeId
- Composant frontend: GoogleRating.tsx