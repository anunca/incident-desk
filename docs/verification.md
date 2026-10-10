# Vérification de la livraison

Contrôles exécutés dans l’environnement de création :

- TypeScript strict : API, scripts et tests.
- ESLint et formatage Prettier.
- 13 tests HTTP : authentification, rôle lecteur, CSRF, révocation, expiration, validation, transitions, conflit de version, métriques, sondes et limitation de débit.
- Compilation du serveur.
- Audit des dépendances de production : aucune vulnérabilité signalée au moment du contrôle.

Trois tests PostgreSQL sont fournis : concurrence avec verrou/version, rollback lors d’un échec de l’audit, paramètres SQL. Ils sont configurés dans la CI mais n’ont pas été exécutés ici : PostgreSQL ne peut pas être lancé avec les permissions de cet environnement. Docker n’est pas disponible ici ; l’image et Compose ne sont donc pas validés par une exécution locale. AWS n’est ni déployé ni validé contre un compte réel.

Ne pas présenter les tests d’intégration, le déploiement AWS ou la restauration comme déjà réussis. Avant présentation publique, lancer `make up`, les tests PostgreSQL, une démonstration navigateur et la CI GitHub. Le modèle AWS est un runtime conditionné à une infrastructure réseau et DB existante, pas un déploiement complet autonome.
