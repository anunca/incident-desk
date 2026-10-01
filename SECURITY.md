# Sécurité

Ce dépôt est une démonstration, à durcir avant mise en production.

| Risque                | Mesure présente                                                            | Limite / suite                                      |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Vol de mots de passe  | scrypt salé, jamais de mot de passe dans les réponses                      | ajouter OIDC/MFA et reset sûr                       |
| Vol de session        | token aléatoire, haché en DB, expiration, révocation                       | HTTPS obligatoire, rotation selon risque            |
| CSRF                  | SameSite Strict, header personnalisé sur mutations cookie, absence de CORS | ne pas ouvrir CORS aux origines arbitraires         |
| Injection SQL         | paramètres `$1`, contraintes                                               | comptes SQL avec moindre privilège                  |
| XSS                   | textContent, CSP sans script inline                                        | pas de contenu HTML utilisateur                     |
| Brute force / abus    | limites de requêtes et de corps                                            | limiteur partagé / WAF en multi-instance            |
| Écrasement concurrent | versions, transaction, verrou                                              | rechargement côté utilisateur après 409             |
| Fuite de secrets      | logs expurgés, erreurs internes génériques, .gitignore                     | revue des logs et rotation des secrets              |
| Audit modifiable      | historique transactionnel                                                  | archive indépendante et rôle SQL sans UPDATE/DELETE |

En production : activer COOKIE_SECURE=true, TLS en entrée et vers PostgreSQL avec validation du certificat, ne pas exposer PostgreSQL, remplacer les identifiants locaux, utiliser Secrets Manager, limiter les accès métriques, et séparer compte migrations / compte applicatif. Les données d’incident sont visibles à tous les comptes : ce modèle convient à une équipe unique, pas à plusieurs clients indépendants.

Ne pas enregistrer d’information personnelle ou de secret dans les titres/descriptions. Les cookies et mots de passe de production ne doivent jamais être ajoutés au dépôt. Signaler une vulnérabilité via un canal privé du propriétaire du dépôt ; éviter les détails exploitables dans une issue publique.
