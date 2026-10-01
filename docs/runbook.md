# Exploitation

## Symptômes

- Live 200 / ready 503 : vérifier accès DB, secrets, saturation du pool et connexions réseau.
- 409 : recharger l’incident ; ne pas relancer automatiquement avec une nouvelle version.
- 401 : session expirée/révoquée ; reconnecter le client.
- 429 : vérifier l’activité et les limites par instance avant toute augmentation.
- Latence élevée : corréler `requestId`, histogramme et activité PostgreSQL.

## Sauvegarde et restauration locale

```sh
docker compose exec -T db pg_dump -U incident -d incidents -Fc > incidents.dump
```

La sauvegarde contient des données sensibles. Chiffrer, restreindre les accès et fixer une rétention. Tester la restauration dans une AUTRE base vide avec `pg_restore`, puis exécuter les contrôles fonctionnels. Ne jamais considérer une sauvegarde réussie comme une restauration vérifiée.

En AWS : sauvegardes automatiques RDS et restauration à un instant donné selon les objectifs RPO/RTO définis. Le template runtime ne provisionne pas RDS.

## Maintenance

Supprimer périodiquement les sessions expirées : `DELETE FROM sessions WHERE expires_at < now();`.
Appliquer des migrations additives compatibles avant de remplacer les instances. Une migration appliquée ne se modifie pas ; créer une suivante. Restaurer l’image précédente ne restaure pas le schéma ni les données.

SIGTERM ferme l’écoute et le pool ; délai maximal local de dix secondes. Maintenir la base hors Internet et surveiller espace disque, connexions et sauvegardes.

Les métriques n’utilisent ni email ni identifiant d’incident en label. Le endpoint est admin-only : le collecteur nécessite une session valide à renouveler ; une authentification machine dédiée serait préférable en production.
