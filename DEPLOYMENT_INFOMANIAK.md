# Guide de Déploiement - Infomaniak Node.js Sites

## Prérequis

- Un compte Infomaniak avec un hébergement Node.js Sites
- Une base de données MySQL (incluse avec l'hébergement)
- Node.js 20 LTS ou 22 LTS (recommandé)

> **Note**: Node.js 24 n'est pas encore une version LTS stable. Utilisez Node.js 20 ou 22 pour la production.

## Étape 1: Préparer les fichiers

### 1.1 Télécharger le projet

Téléchargez tous les fichiers du projet depuis Replit.

### 1.2 Construire l'application

Sur votre machine locale (ou dans Replit):

```bash
npm install
npm run build
```

Cela créera un dossier `dist/` contenant:
- `dist/index.cjs` - Le serveur compilé
- `dist/public/` - Les fichiers frontend

## Étape 2: Configurer la base de données MySQL

### 2.1 Créer la base de données sur Infomaniak

1. Connectez-vous à votre Manager Infomaniak
2. Allez dans "Hébergement Web" > "Base de données"
3. Créez une nouvelle base de données MySQL
4. Notez les informations:
   - Hôte (ex: `xxxxx.myd.infomaniak.com`)
   - Nom de la base de données
   - Utilisateur
   - Mot de passe

### 2.2 Créer les tables

Connectez-vous à phpMyAdmin (disponible dans le Manager) et exécutez ce SQL:

```sql
-- Table des utilisateurs
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- Table des restaurants
CREATE TABLE restaurants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cuisine VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  rating FLOAT NOT NULL,
  price_range VARCHAR(20) NOT NULL,
  image VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  features JSON NOT NULL
);

-- Table des réservations
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT NOT NULL,
  date VARCHAR(20) NOT NULL,
  time VARCHAR(10) NOT NULL,
  guests INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  special_request TEXT,
  newsletter INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Insérer les restaurants de démonstration
INSERT INTO restaurants (name, cuisine, location, rating, price_range, image, description, features) VALUES
('La Tavola Rustica', 'Italien', 'Zurich', 4.8, '$$', '/assets/generated_images/authentic_italian_pasta_dish.png', 'Pâtes artisanales authentiques servies dans un cadre chaleureux et rustique.', '["Terrasse", "Végétarien", "Accessible PMR"]'),
('Chalet de Montagne', 'Suisse', 'Zermatt', 4.9, '$$$', '/assets/generated_images/swiss_cheese_fondue_cozy_setting.png', 'Découvrez le cœur de la Suisse avec nos légendaires fondues et raclettes.', '["Vue Montagne", "Salle Privée", "Ambiance Cosy"]'),
('Lumière', 'Européen Moderne', 'Genève', 4.7, '$$$$', '/assets/generated_images/modern_fine_dining_plated_dish.png', 'Un voyage culinaire à travers l''Europe moderne.', '["Étoilé Michelin", "Menu Dégustation", "Sommelier"]'),
('Alpenblick', 'Suisse / Français', 'Interlaken', 4.6, '$$$', '/assets/generated_images/elegant_restaurant_dining_atmosphere_hero_background.png', 'Dîner élégant avec vue panoramique sur les Alpes.', '["Vue Panoramique", "Vins Fins", "Romantique"]');
```

## Étape 3: Déployer sur Infomaniak

### 3.1 Créer un site Node.js

1. Dans le Manager Infomaniak, allez à "Sites" > "Nouveau site"
2. Choisissez "Node.js"
3. Sélectionnez **Node.js 20 LTS** (recommandé)
4. Configurez le domaine (ex: wheretoeat.ch)

### 3.2 Configurer les variables d'environnement

Dans les paramètres du site Node.js, ajoutez ces variables:

| Variable | Valeur |
|----------|--------|
| `MYSQL_HOST` | xxxxx.myd.infomaniak.com |
| `MYSQL_USER` | votre_utilisateur |
| `MYSQL_PASSWORD` | votre_mot_de_passe |
| `MYSQL_DATABASE` | nom_de_la_base |
| `NODE_ENV` | production |

> Le `PORT` est automatiquement fourni par Infomaniak.

### 3.3 Transférer les fichiers

Transférez via SFTP les fichiers suivants (NE PAS inclure node_modules):

```
/votre-site/
├── dist/
│   ├── index.cjs          (serveur compilé)
│   └── public/            (fichiers frontend)
├── attached_assets/       (images générées)
└── package.json
```

> **Important**: Ne transférez PAS le dossier `node_modules/`. Les dépendances seront installées directement sur le serveur.

### 3.4 Installer les dépendances

Via SSH ou le terminal Infomaniak:

```bash
cd /votre-site
npm install --production
```

Cela installera les dépendances nécessaires sur le serveur.

### 3.5 Démarrer l'application

Configurez le script de démarrage dans le Manager:
- **Commande de démarrage**: `npm run start`

Ou utilisez:
```bash
node dist/index.cjs
```

## Étape 4: Vérification

1. Visitez votre site (ex: https://wheretoeat.ch)
2. Vérifiez que les restaurants s'affichent
3. Testez une réservation

## Dépannage

### L'application ne démarre pas
- Vérifiez les logs dans le Manager Infomaniak
- Assurez-vous que toutes les variables d'environnement sont définies

### Erreur de connexion à la base de données
- Vérifiez que l'hôte MySQL est correct (format: xxxxx.myd.infomaniak.com)
- Vérifiez les identifiants de connexion

### Les images ne s'affichent pas
- Assurez-vous que le dossier `attached_assets/` est bien transféré
- Vérifiez les permissions des fichiers

## Structure des fichiers pour la production

```
wheretoeat/
├── dist/
│   ├── index.cjs           # Serveur Node.js compilé
│   └── public/
│       ├── index.html      # Frontend
│       └── assets/         # CSS, JS compilés
├── attached_assets/
│   └── generated_images/   # Images des restaurants
└── package.json            # Configuration npm
```

> Les `node_modules/` seront créés automatiquement lors de l'installation sur le serveur.

## Support

Pour toute question concernant l'hébergement, consultez la documentation Infomaniak:
https://www.infomaniak.com/fr/support/faq/web-hebergement
