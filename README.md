# 🏥 Mediconnect - Plateforme de Gestion Médicale

Une plateforme web complète de gestion médicale permettant la communication et la coordination entre médecins, patients, et gestionnaires administratifs.

---

## 📋 Table des matières

- [Spécifications Techniques](#spécifications-techniques)
- [Architecture](#architecture)
- [Installation](#installation)
- [Structure du Projet](#structure-du-projet)
- [Rôles et Permissions](#rôles-et-permissions)
- [Stack Technologique](#stack-technologique)
- [API et Endpoints](#api-et-endpoints)
- [Déploiement](#déploiement)
- [Développement](#développement)

---

## 🔧 Spécifications Techniques

### Environnement Requis

| Composant | Version |
|-----------|---------|
| **PHP** | 8.1+ |
| **Node.js** | 16+ |
| **MySQL** | 5.7+ |
| **Composer** | 2.0+ |
| **npm** | 8.0+ |

### Services & Infrastructure

- **Serveur Web** : Apache/Nginx (configuration fournie dans `/deploy`)
- **Base de Données** : MySQL/MariaDB
- **Cache** : Redis (optionnel)
- **File Storage** : Stockage local (Amazon S3 compatible)
- **Mail** : Configuration SMTP

---

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────┐
│         FRONTEND (React + Vite)          │
│  ├─ Pages (Login, Dashboard, etc.)      │
│  ├─ Components (Modals, Navbar, etc.)   │
│  ├─ Context API (Authentication)        │
│  ├─ Axios (HTTP Client)                 │
│  └─ React Router (Navigation)            │
└────────────┬────────────────────────────┘
             │ HTTP/HTTPS
             ↓
┌─────────────────────────────────────────┐
│    BACKEND (Laravel 11 + PHP 8.1)        │
│  ├─ API REST                             │
│  ├─ Authentification (Sanctum)           │
│  ├─ Gestion des Rôles (Spatie)          │
│  ├─ ORM (Eloquent)                       │
│  └─ Migrations & Seeds                   │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│    BASE DE DONNÉES (MySQL/MariaDB)       │
│  ├─ Users & Profiles                     │
│  ├─ Roles & Permissions                  │
│  ├─ Appointments                         │
│  ├─ Medical Records                      │
│  └─ Communications                       │
└─────────────────────────────────────────┘
```

### Pattern Architectural

- **API REST** : Architecture RESTful avec endpoints JSON
- **SPA (Single Page Application)** : Frontend React réactif
- **Token-based Authentication** : Laravel Sanctum pour sécuriser les API
- **Role-Based Access Control (RBAC)** : Gestion granulaire des permissions avec Spatie

---

## 💻 Stack Technologique

### Backend

```json
{
  "PHP": "8.1+",
  "Laravel": "11.x",
  "Database": "MySQL 5.7+",
  "Authentication": "Laravel Sanctum 4.0+",
  "Permissions": "Spatie Laravel Permission 6.21+",
  "HTTP Client": "Guzzle 7.2+",
  "Testing": "PHPUnit 10.0+"
}
```

#### Dépendances principales Backend

| Package | Version | Utilité |
|---------|---------|---------|
| `laravel/framework` | ^11.0 | Framework principal |
| `laravel/sanctum` | ^4.0 | Authentification API |
| `spatie/laravel-permission` | ^6.21 | Gestion des rôles/permissions |
| `guzzlehttp/guzzle` | ^7.2 | Client HTTP |
| `laravel/tinker` | ^2.8 | REPL interactif |

#### Dépendances Dev Backend

- `phpunit/phpunit` : Tests unitaires
- `laravel/pint` : Linter PHP
- `friendsofphp/php-cs-fixer` : Formatage du code
- `fakerphp/faker` : Données de test

### Frontend

```json
{
  "React": "19.1.1",
  "Vite": "4.x",
  "React Router": "7.9.3",
  "Node.js": "16+",
  "JavaScript": "ES2020+",
  "CSS": "Modules + Vanilla CSS"
}
```

#### Dépendances principales Frontend

| Package | Version | Utilité |
|---------|---------|---------|
| `react` | ^19.1.1 | Framework UI |
| `react-dom` | ^19.1.1 | Rendu DOM |
| `react-router-dom` | ^7.9.3 | Routing côté client |
| `axios` | ^1.12.2 | Client HTTP |
| `@fullcalendar/react` | ^6.1.19 | Calendrier événements |
| `react-easy-crop` | ^5.5.7 | Outil de crop d'images |
| `sweetalert2` | ^11.10.5 | Alertes UI |
| `react-toastify` | ^11.0.5 | Notifications toast |
| `lucide-react` | ^0.545.0 | Icônes SVG |
| `react-bootstrap-icons` | ^1.11.4 | Icônes Bootstrap |

#### Dépendances Dev Frontend

- `@vitejs/plugin-react` : Support React dans Vite
- `@eslint/js` : Linting JavaScript
- `vite` : Build tool
- `prettier` : Formatage de code

---

## 📁 Structure du Projet

### Hiérarchie générale

```
Mediconnect/
├── backend/
│   └── laravel/                    # Application Laravel
│       ├── app/
│       │   ├── Console/            # Commandes artisan
│       │   ├── Exceptions/         # Gestion des erreurs
│       │   ├── Http/
│       │   │   ├── Controllers/    # Contrôleurs API
│       │   │   ├── Middleware/     # Middleware auth, CORS, etc.
│       │   │   └── Requests/       # Validations des requêtes
│       │   ├── Models/             # Modèles Eloquent
│       │   └── Providers/          # Service providers
│       ├── bootstrap/              # Initialisation app
│       ├── config/                 # Configuration
│       │   ├── app.php             # Configuration générale
│       │   ├── auth.php            # Configuration authentification
│       │   ├── database.php        # Configuration DB
│       │   ├── cors.php            # Configuration CORS
│       │   ├── permission.php      # Configuration Spatie
│       │   └── sanctum.php         # Configuration Sanctum
│       ├── database/
│       │   ├── migrations/         # Migrations BD
│       │   ├── seeders/            # Seeders (données initiales)
│       │   └── factories/          # Factories pour tests
│       ├── routes/
│       │   ├── api.php             # Routes API
│       │   └── web.php             # Routes web
│       ├── storage/
│       │   ├── app/                # Stockage fichiers
│       │   ├── logs/               # Logs application
│       │   └── photo-profile/      # Photos de profil
│       ├── tests/                  # Tests unitaires & feature
│       ├── composer.json           # Dépendances PHP
│       └── .env.example            # Fichier d'env exemple
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Composants React
│   │   │   ├── CropImageModal.jsx  # Modal cropping images
│   │   │   └── ...
│   │   ├── pages/                  # Pages principales
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Home.jsx
│   │   │   └── ...
│   │   ├── context/                # Context API
│   │   │   └── AuthContext.jsx     # État authentification
│   │   ├── api/
│   │   │   └── axios.js            # Configuration Axios
│   │   ├── assets/                 # Images, fonts, etc.
│   │   ├── App.jsx                 # Composant racine
│   │   ├── App.css                 # Styles globaux
│   │   ├── index.css               # Styles de base
│   │   └── main.jsx                # Point d'entrée
│   ├── public/
│   │   └── logo/                   # Assets publics
│   ├── index.html                  # HTML principal
│   ├── package.json                # Dépendances npm
│   ├── vite.config.js              # Configuration Vite
│   └── eslint.config.js            # Configuration ESLint
│
├── deploy/                         # Configuration déploiement
│   ├── api.mediconnect.conf        # Conf Nginx API
│   ├── mediconnect.conf            # Conf Nginx Frontend
│   ├── pma.mediconnect.conf        # Conf PhpMyAdmin
│   └── default                     # Conf par défaut
│
├── explication/                    # Documentation
│   ├── ROLES_STRUCTURE.md          # Structure rôles/permissions
│   ├── LIAISON_SECRETAIRE_MEDECIN.md
│   ├── SUPER_ADMIN_GUIDE.md
│   └── COMPTES_TEST.md             # Comptes de test
│
├── prettier.config.js              # Configuration Prettier
└── README.md                       # Ce fichier
```

---

## 👥 Rôles et Permissions

### Rôles Disponibles

| Rôle | Description | Permissions |
|------|-------------|------------|
| **Admin** | Administrateur système | Accès complet à toutes les fonctionnalités |
| **Médecin** | Praticien médical | Gestion patients, calendrier, dossiers médicaux |
| **Client/Patient** | Patient/Utilisateur | Consultation dossiers, prise RDV |
| **Gestionnaire** | Gestionnaire administratif | Gestion des rendez-vous, secrétariat |

### Tables de Gestion des Permissions (Spatie)

La gestion des rôles et permissions utilise le package **Spatie Laravel Permission** qui crée 5 tables :

1. **`roles`** : Définit les rôles (admin, médecin, client, etc.)
2. **`permissions`** : Définit les permissions spécifiques
3. **`model_has_roles`** : Lie les utilisateurs aux rôles (pivot)
4. **`model_has_permissions`** : Lie les permissions directement aux utilisateurs
5. **`role_has_permissions`** : Lie les permissions aux rôles

### Architecture des Permissions

```sql
-- Structure relationnelle
User (1) ──── (N) model_has_roles ──── (1) Role
                                        │
                                        └──(N) role_has_permissions ──── (N) Permission
```

Pour vérifier les permissions dans le code :
```php
// Dans un contrôleur
if ($user->hasRole('medecin')) {
    // Logique médecin
}

// Vérifier une permission
if ($user->can('edit-appointments')) {
    // Peut éditer les RDV
}
```

---

## 🔌 API et Endpoints

### Configuration de Base

- **Base URL Backend** : `http://localhost:8000/api`
- **Authentification** : Bearer Token (Laravel Sanctum)
- **Format Response** : JSON
- **CORS** : Configuré dans `backend/laravel/config/cors.php`

### Authentification

```
POST /api/login
POST /api/register
POST /api/logout
GET  /api/user (authentifié)
```

### Structure de Réponse API

**Succès (200 OK)**
```json
{
  "success": true,
  "data": { /* données */ },
  "message": "Operation successful"
}
```

**Erreur (4xx/5xx)**
```json
{
  "success": false,
  "message": "Error description",
  "errors": { /* validation errors */ }
}
```

### Endpoints Principaux

Consultez [routes/api.php](backend/laravel/routes/api.php) pour la liste complète des endpoints.

---

## 🚀 Installation

### Prérequis

- PHP 8.1 ou supérieur
- Composer installé
- Node.js 16+ et npm installés
- MySQL/MariaDB en cours d'exécution
- Un serveur web (Apache/Nginx)

### Setup Backend

```bash
# Naviguer vers le backend
cd backend/laravel

# Installer les dépendances PHP
composer install

# Copier le fichier .env
cp .env.example .env

# Générer une clé d'application
php artisan key:generate

# Configurer la base de données dans .env
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=mediconnect
# DB_USERNAME=root
# DB_PASSWORD=

# Exécuter les migrations
php artisan migrate

# Exécuter les seeders (données initiales)
php artisan db:seed

# Démarrer le serveur de développement
php artisan serve
```

### Setup Frontend

```bash
# Naviguer vers le frontend
cd frontend

# Installer les dépendances npm
npm install

# Démarrer le serveur de développement (Vite)
npm run dev

# Construire pour la production
npm run build

# Linter le code
npm run lint

# Formater le code
npm run format
```

### Commande Rapide (Lancer tout)

À partir de la racine du projet :
```bash
npm run dev  # Lance frontend et backend en parallèle
```

---

## 🛠️ Développement

### Commandes Courantes Backend

```bash
# Artisan commands
php artisan migrate              # Exécuter les migrations
php artisan migrate:rollback     # Annuler dernière migration
php artisan db:seed              # Exécuter les seeders
php artisan tinker               # Shell interactif
php artisan make:model User      # Créer un modèle
php artisan make:controller UserController --api  # Créer un contrôleur
php artisan make:middleware Auth                  # Créer un middleware
php artisan test                 # Exécuter les tests

# Code formatting
composer fix:php                 # Corriger le style PHP
npm run format:blade             # Formater les fichiers Blade
```

### Commandes Courantes Frontend

```bash
npm run dev                  # Démarrer serveur de dev
npm run build               # Build pour production
npm run preview             # Aperçu build production
npm run lint                # Vérifier le code
npm run format              # Formater le code avec Prettier
```

### Conventions de Code

#### Backend (Laravel/PHP)

- **PSR-12** : Standard PHP
- **Modèles** : Singulier (User, Appointment, etc.)
- **Controllers** : Suffixe "Controller"
- **Migrations** : Format `YYYY_MM_DD_HHMMSS_action.php`
- **Permissions** : kebab-case (e.g., `edit-appointments`)

#### Frontend (React/JavaScript)

- **Composants** : PascalCase (e.g., `UserDashboard.jsx`)
- **Hooks** : camelCase (e.g., `useAuth`)
- **Fichiers de styles** : Module CSS (e.g., `Component.module.css`)
- **Imports** : Organiser par ordre de priorité (React, libs, locals)

---

## 📦 Déploiement

### Configuration Nginx

Des fichiers de configuration Nginx sont fournis dans `/deploy` :

- `mediconnect.conf` : Configuration du frontend
- `api.mediconnect.conf` : Configuration de l'API
- `pma.mediconnect.conf` : Configuration PhpMyAdmin

### Environnement de Production

1. **Configurer le fichier `.env`** avec les variables de production
2. **Générer les assets** :
   ```bash
   npm run build                    # Frontend
   php artisan config:cache         # Backend
   php artisan route:cache
   php artisan view:cache
   ```
3. **Configurer HTTPS** avec SSL/TLS
4. **Configurer les backups** de base de données
5. **Monitorer les logs** : `/storage/logs`

---

## 📝 Variables d'Environnement Clés

### Backend (.env)

```env
APP_NAME=Mediconnect
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...
APP_URL=

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mediconnect
DB_USERNAME=root
DB_PASSWORD=...

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...

SANCTUM_STATEFUL_DOMAINS=mediconnect.com
SESSION_DOMAIN=mediconnect.com
```

### Frontend (.env)

```env
VITE_API_URL=
VITE_APP_NAME=Mediconnect
```

---

## 🧪 Tests

### Backend

```bash
# Exécuter tous les tests
php artisan test

# Tests d'une classe spécifique
php artisan test tests/Feature/UserControllerTest.php

# Tests avec couverture de code
php artisan test --coverage
```

### Frontend

```bash
# Linting avec ESLint
npm run lint
```

---

## 📚 Documentation Supplémentaire

- **Gestion des Rôles** : Voir [explication/ROLES_STRUCTURE.md](explication/ROLES_STRUCTURE.md)
- **Liaison Secrétaire-Médecin** : Voir [explication/LIAISON_SECRETAIRE_MEDECIN.md](explication/LIAISON_SECRETAIRE_MEDECIN.md)
- **Guide Super Admin** : Voir [explication/SUPER_ADMIN_GUIDE.md](explication/SUPER_ADMIN_GUIDE.md)
- **Comptes de Test** : Voir [explication/COMPTES_TEST.md](explication/COMPTES_TEST.md)

---

## 🐛 Troubleshooting

### Erreurs Courantes

| Problème | Solution |
|----------|----------|
| Erreur CORS | Vérifier `config/cors.php` et les headers de requête |
| Token invalide | Vérifier que Sanctum est correctement configuré |
| Migration échouée | Vérifier les permissions DB et l'ordre des migrations |
| Port déjà utilisé | Changer le port : `php artisan serve --port=8001` |
| Module npm manquant | Exécuter `npm install` à nouveau |

---

## 📞 Support et Contact

Pour toute question ou problème, consultez la documentation dans le dossier `/explication` ou contactez l'équipe de développement.

---

## 📄 Licence

MIT License - Voir LICENSE pour plus de détails

---

**Dernière mise à jour** : Août 2026  
**Version** : 1.0.0
