# Incident Desk

Projet de démonstration professionnel : suivi d’incidents avec API TypeScript, PostgreSQL et interface web React. Il montre des choix explicables et testables, sans prétendre remplacer un outil de gestion d’incidents de production.

## Architecture

Le [guide d’architecture](docs/architecture.md) décrit les modules, les flux HTTP et transactionnels, le modèle de données, la sécurité, le déploiement et les évolutions proposées.

## Démonstration en cinq minutes

Prérequis : Node.js 26, npm, Docker avec Compose v2. Sur macOS, Docker Desktop ou un moteur compatible.

```sh
npm ci
make up
```

Compose démarre PostgreSQL, applique les migrations, puis démarre l’application. Créer un administrateur depuis le terminal (le mot de passe n’apparaît pas dans l’historique ; shell bash/zsh) :

```sh
read -rs 'INCIDENT_PASSWORD?Mot de passe (12 caractères minimum) : '; echo
printf '%s' "$INCIDENT_PASSWORD" | DATABASE_URL=postgres://incident:local-development-only@localhost:5432/incidents npm run user:create -- admin@example.test admin
unset INCIDENT_PASSWORD
```

La syntaxe `read` ci-dessus est celle de zsh, par défaut sur macOS. En bash, utiliser `read -rs -p 'Mot de passe : ' INCIDENT_PASSWORD`.

Ouvrir http://localhost:3000, se connecter, créer un incident, changer son statut et consulter son historique. Créer aussi un compte `reader` pour démontrer les accès refusés. Aucun compte ou mot de passe de démonstration n’est précréé.

`make down` conserve le volume de données. `docker compose down -v` le supprime : commande destructive à utiliser uniquement sur la démonstration.

## Ce que le projet prouve

| Pratique                                                         | Preuve dans le dépôt                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Modélisation métier et transitions explicites                    | `src/server/domain/models.ts`                                                         |
| Validation stricte et taille des requêtes limitée                | `src/server/app.ts`                                                                   |
| Authentification, sessions révocables, rôles                     | `src/server/security/crypto.ts`, `src/server/app.ts`                                  |
| Mots de passe salés avec scrypt, tokens stockés hachés           | `src/server/security/crypto.ts`, `src/server/persistence/`                            |
| Cookies HttpOnly/SameSite et protection CSRF des écritures       | routes de session et `writeAccess`                                                    |
| Prévention des injections SQL                                    | requêtes paramétrées dans `src/server/persistence/`                                   |
| Incident et historique enregistrés atomiquement                  | transactions PostgreSQL                                                               |
| Conflits concurrents explicites plutôt qu’écrasements silencieux | verrou de ligne et version, réponse HTTP 409                                          |
| Migrations versionnées, checksum et verrou global                | `scripts/migrate.ts`                                                                  |
| Observabilité sans labels à cardinalité incontrôlée              | logs structurés, identifiant de requête, métriques par modèle de route                |
| Exploitation                                                     | sondes live/ready, délais DB, arrêt SIGTERM, `docs/runbook.md`                        |
| Cas d’usage indépendants du transport                            | `src/server/application/`, tests métier et ports atomiques                            |
| Contrats HTTP uniques                                            | TypeBox, types inférés et OpenAPI généré                                              |
| Qualité automatisée                                              | tests métier + API + PostgreSQL + navigateur, TypeScript strict, ESLint, Prettier, CI |
| Conteneur avec droits réduits                                    | Docker multiétage, utilisateur non-root, système de fichiers en lecture seule         |
| Architecture et décisions documentées                            | `docs/architecture.md`, ADR et modèle de menace                                       |
| Déploiement AWS en code                                          | `infra/aws-runtime.yml`, prérequis et limites dans `infra/README.md`                  |

## Développement sans conteneur applicatif

```sh
make dev
```

Cette commande installe les dépendances, crée `.env` si nécessaire, démarre PostgreSQL, applique les migrations et crée un administrateur local. L’API et le bundle React sont reconstruits automatiquement pendant le développement.

Ouvrir http://127.0.0.1:3000 et se connecter avec `admin@example.test` / `local-development-only`. Pour choisir les identifiants, modifier `DEV_EMAIL` et `DEV_PASSWORD` dans `.env`. Le mot de passe doit avoir 12 à 128 caractères. À chaque démarrage, le mot de passe de cet utilisateur local est synchronisé avec `DEV_PASSWORD` ; son rôle existant est conservé. Après un changement de mot de passe, exécuter `make dev-user` ou relancer `make dev`.

Le mode `NODE_ENV=development` désactive les cookies Secure, HSTS et la directive CSP `upgrade-insecure-requests` pour permettre HTTP local. Ces exceptions ne s’appliquent pas au mode production. Aucun compte de démonstration n’est créé par le déploiement de production.

`make migrate` et `make dev-user` chargent `.env`. Les commandes `npm run migrate` et `npm run user:create` nécessitent DATABASE_URL dans l’environnement.

TypeScript reste en version 6.0.x : la dernière version de `typescript-eslint` ne prend pas encore en charge TypeScript 7.

## Vérifications

```sh
npm run check
npm run build
DATABASE_URL=postgres://incident:local-development-only@localhost:5432/incidents npm run migrate
TEST_DATABASE_URL=postgres://incident:local-development-only@localhost:5432/incidents npm run test:integration
npm audit --omit=dev --audit-level=high
```

`make test-integration` démarre une base PostgreSQL dédiée sur le port 5433, applique les migrations et lance les tests, sans configuration préalable. Les données de cette base sont temporaires. Pour arrêter le conteneur de test : `docker compose --profile test stop db-test`.

Pour `npm run test:integration`, fournir `TEST_DATABASE_URL` vers une base dédiée et déjà migrée. Ils créent leurs propres utilisateurs/incidents et les nettoient ; ils ne réinitialisent pas les tables. La CI fournit une base PostgreSQL éphémère et applique deux fois les migrations pour vérifier leur réexécution.

## API

Voir `docs/api.md` pour les requêtes, rôles et erreurs. L’interface utilise un cookie de session ; un client API peut utiliser le token retourné par la connexion en Bearer. Le token n’est jamais enregistré dans le stockage du navigateur.

## Présenter le projet en entretien

1. Montrer le problème métier et une création d’incident.
2. Expliquer les frontières : transport HTTP, règles métier, persistance.
3. Faire deux changements avec la même version : le second reçoit 409.
4. Montrer que le rôle lecteur peut consulter mais ne peut pas modifier.
5. Expliquer une transaction qui échoue et son rollback.
6. Présenter les sondes, métriques, procédure de restauration et limites connues.

Ce projet est un exercice de portfolio : il ne revendique aucun résultat client réel. Pour ton CV : « Projet personnel : API de suivi d’incidents TypeScript/PostgreSQL, contrôle d’accès, audit transactionnel, tests d’intégration et déploiement conteneurisé. »

## Limites assumées

Pas de multitenant : tous les utilisateurs connectés voient les mêmes incidents. Le rôle admin donne accès aux métriques ; la gestion des utilisateurs est une CLI. Pas de SSO/MFA, réinitialisation de mot de passe, notifications, pièces jointes ni idempotence des créations. La limitation de débit est locale à chaque processus. L’audit applicatif n’est pas inviolable face à un administrateur PostgreSQL. Docker et AWS doivent être validés dans leurs environnements cibles avant exploitation. Voir `SECURITY.md` et `docs/verification.md`.

## Régressions navigateur

```sh
npx playwright install chromium
npm run test:browser
```

Les tests démarrent une application locale sur le port 3100 avec un stockage mémoire et des comptes exclusivement de test. Ils vérifient le chargement HTTP local, la restauration du cookie après rechargement, l’expiration, le rôle lecteur et l’actualisation de l’historique après mutation. Ils complètent les tests PostgreSQL sans les remplacer. Docker Compose active explicitement le mode development pour son accès localhost en HTTP ; l’image seule garde ses paramètres de production et la politique HTTPS.
