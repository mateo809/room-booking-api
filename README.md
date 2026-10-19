# Room Booking API

API REST de réservation de salles de réunion construite avec Node.js, TypeScript, Express 5, Prisma et PostgreSQL.

Les membres recherchent une salle libre selon leurs besoins (capacité, équipement, créneau) et la réservent. Les administrateurs gèrent le parc de salles. L'absence de double réservation est garantie au niveau de la base de données, y compris en cas de requêtes simultanées.

## Fonctionnalités

- Inscription et connexion avec authentification JWT
- Deux rôles : `MEMBER` et `ADMIN`, avec contrôle d'accès par route
- Gestion des salles par les administrateurs : création, modification, désactivation
- Recherche de salles filtrée par capacité, équipement et disponibilité sur un créneau
- Planning d'une salle sur une période donnée
- Réservation avec règles métier : créneau futur, durée entre 15 minutes et 8 heures, capacité de la salle respectée
- Annulation par le propriétaire ou un administrateur
- Protection contre les chevauchements par une contrainte d'exclusion PostgreSQL
- Validation de toutes les entrées avec Zod et erreurs JSON homogènes
- Pagination des listes
- Logs structurés avec Pino et en-têtes de sécurité avec Helmet
- Tests unitaires et tests d'intégration sur une vraie base PostgreSQL
- Conteneurisation Docker et intégration continue GitHub Actions

## Stack technique

| Domaine         | Technologies                                        |
| --------------- | --------------------------------------------------- |
| Langage         | TypeScript (mode strict), Node.js 22                |
| API             | Express 5, Zod                                      |
| Base de données | PostgreSQL 17, Prisma 7 avec le driver adapter `pg` |
| Sécurité        | JWT, bcrypt, Helmet                                 |
| Qualité         | ESLint (typescript-eslint strict), Prettier         |
| Tests           | Vitest, Supertest                                   |
| Outillage       | Docker, Docker Compose, GitHub Actions              |

## Garantir l'absence de double réservation

Une vérification applicative ne suffit pas : deux requêtes simultanées peuvent toutes deux constater qu'un créneau est libre avant d'écrire. La règle est donc aussi imposée par PostgreSQL grâce à une contrainte d'exclusion sur les intervalles de temps :

```sql
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
    EXCLUDE USING gist ("room_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
    WHERE ("status" = 'CONFIRMED');
```

Deux réservations confirmées d'une même salle ne peuvent pas se chevaucher, tandis que des créneaux consécutifs (10h-11h puis 11h-12h) restent possibles. Une réservation annulée libère immédiatement son créneau. La violation de la contrainte est traduite en réponse `409 Conflict`, et un test d'intégration envoie plusieurs réservations concurrentes pour le vérifier.

## Architecture

```
src
├── app.ts               Construction de l'application Express
├── server.ts            Démarrage du serveur et arrêt propre
├── config               Variables d'environnement validées au démarrage
├── lib                  Prisma, logger, erreurs, pagination, dates
├── middleware           Authentification, rôles, gestion des erreurs
└── modules
    ├── auth             Inscription, connexion, jetons JWT
    ├── rooms            Salles, recherche et planning
    └── bookings         Réservations et règles métier

prisma
├── schema.prisma        Modèle de données
├── migrations           Migrations SQL versionnées
└── seed.ts              Données initiales (administrateur et salles)

tests
├── unit                 Tests des règles métier
└── *.test.ts            Tests d'intégration HTTP
```

Chaque module sépare les schémas de validation, la logique métier et les routes. Les règles métier des réservations sont des fonctions pures testées indépendamment de la base de données.

## Modèle de données

| Table      | Description                                        |
| ---------- | -------------------------------------------------- |
| `users`    | Comptes, email unique, rôle                        |
| `rooms`    | Salles, capacité, étage, équipements, statut actif |
| `bookings` | Réservations, créneau, participants, statut        |

## Endpoints

| Méthode | Route                             | Rôle                  | Description                                                                                            |
| ------- | --------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `POST`  | `/api/auth/register`              | Public                | Créer un compte membre                                                                                 |
| `POST`  | `/api/auth/login`                 | Public                | Se connecter et obtenir un jeton                                                                       |
| `GET`   | `/api/auth/me`                    | Authentifié           | Profil de l'utilisateur connecté                                                                       |
| `GET`   | `/api/rooms`                      | Authentifié           | Rechercher des salles (`minCapacity`, `equipment`, `availableFrom`, `availableTo`, `page`, `pageSize`) |
| `GET`   | `/api/rooms/:roomId`              | Authentifié           | Détail d'une salle                                                                                     |
| `GET`   | `/api/rooms/:roomId/schedule`     | Authentifié           | Planning d'une salle (`from`, `to`)                                                                    |
| `POST`  | `/api/rooms`                      | Admin                 | Créer une salle                                                                                        |
| `PATCH` | `/api/rooms/:roomId`              | Admin                 | Modifier ou désactiver une salle                                                                       |
| `POST`  | `/api/bookings`                   | Authentifié           | Réserver une salle                                                                                     |
| `GET`   | `/api/bookings/me`                | Authentifié           | Lister ses réservations (`scope`, `status`, `page`, `pageSize`)                                        |
| `GET`   | `/api/bookings/:bookingId`        | Propriétaire ou admin | Détail d'une réservation                                                                               |
| `POST`  | `/api/bookings/:bookingId/cancel` | Propriétaire ou admin | Annuler une réservation                                                                                |
| `GET`   | `/health`                         | Public                | État de l'API et de la base                                                                            |

Toutes les erreurs suivent le même format :

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "This room can host up to 6 people."
  }
}
```

## Lancer le projet

Aucun secret n'est versionné : les mots de passe et le secret JWT sont lus depuis des variables d'environnement, définies localement dans un fichier `.env` ignoré par Git à partir de `.env.example`.

### Avec Docker

```bash
cp .env.example .env
docker compose up --build
```

Les migrations sont appliquées automatiquement avant le démarrage de l'API, disponible sur `http://localhost:3000`.

### En local

Prérequis : Node.js 22.12 ou plus récent et une instance PostgreSQL.

```bash
cp .env.example .env
docker compose up -d database
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Le seed crée un administrateur à partir de `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD`, ainsi que quelques salles.

## Exemple d'utilisation

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<SEED_ADMIN_PASSWORD>"}'

curl "http://localhost:3000/api/rooms?minCapacity=8&availableFrom=2030-05-12T09:00:00Z&availableTo=2030-05-12T10:00:00Z" \
  -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"roomId":"<roomId>","title":"Sprint review","attendees":6,"startsAt":"2030-05-12T09:00:00Z","endsAt":"2030-05-12T10:00:00Z"}'
```

## Scripts

| Commande             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Serveur de développement avec rechargement automatique |
| `npm run build`      | Compilation TypeScript vers `dist`                     |
| `npm start`          | Démarrage de la version compilée                       |
| `npm test`           | Tests unitaires et d'intégration                       |
| `npm run lint`       | Analyse statique                                       |
| `npm run format`     | Formatage du code                                      |
| `npm run typecheck`  | Vérification des types                                 |
| `npm run db:migrate` | Application des migrations                             |
| `npm run db:seed`    | Insertion des données initiales                        |

## Tests

Les tests d'intégration recréent une base dédiée avant chaque exécution puis appliquent les migrations.

```bash
docker compose up -d database
npm test
```

La base de test est définie par la variable `TEST_DATABASE_URL`, lue depuis l'environnement ou le fichier `.env`. Le secret JWT des tests est généré aléatoirement à chaque exécution.

## Configuration

| Variable                 | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `DATABASE_URL`           | Chaîne de connexion PostgreSQL                        |
| `JWT_SECRET`             | Secret de signature des jetons, 32 caractères minimum |
| `JWT_EXPIRES_IN_SECONDS` | Durée de validité d'un jeton                          |
| `PASSWORD_HASH_ROUNDS`   | Coût du hachage bcrypt                                |
| `PORT`                   | Port d'écoute                                         |
| `LOG_LEVEL`              | Niveau de log                                         |

## Auteur

Matéo Tillou
