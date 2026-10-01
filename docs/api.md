# Contrat HTTP

Toutes les routes `/api/incidents` nécessitent une session valide. Une session dure huit heures.

| Méthode et route                       | Entrée / résultat                              | Autorisation           |
| -------------------------------------- | ---------------------------------------------- | ---------------------- |
| POST `/api/session`                    | `{email,password}` → `{token,role}` et cookie  | Publique, débit limité |
| DELETE `/api/session`                  | Révocation, 204                                | Connecté               |
| GET `/api/incidents?limit=20&offset=0` | `{items:[...]}`                                | Connecté               |
| POST `/api/incidents`                  | `{title,description,severity}` → incident, 201 | operator/admin         |
| GET `/api/incidents/:id`               | Incident                                       | Connecté               |
| PATCH `/api/incidents/:id/status`      | `{status,version}` → version suivante          | operator/admin         |
| GET `/api/incidents/:id/events`        | `{items:[...]}`                                | Connecté               |
| GET `/metrics`                         | Format Prometheus                              | admin                  |
| GET `/health/live`                     | Processus vivant                               | Publique               |
| GET `/health/ready`                    | DB accessible, sinon 503                       | Publique               |

Statuts : `open`, `investigating`, `resolved`. Sévérités : `low`, `medium`, `high`, `critical`.
Transitions : open → investigating/resolved ; investigating → open/resolved ; resolved → open. Une transition vers le même statut est refusée.

Un client API envoie `Authorization: Bearer <token>`. L’interface utilise le cookie HttpOnly et `X-Requested-With: incident-desk` pour les mutations. Aucun CORS n’est activé. La réponse de login contenant le token doit rester confidentielle.

Erreurs : 400 validation ; 401 connexion requise ; 403 autorisation/CSRF ; 404 absence ; 409 conflit ou transition invalide ; 429 débit ; 500 erreur interne générique. Corps : `{error,requestId}`. Les requêtes JSON sont limitées à 16 Kio. Les listes sont bornées à 100 éléments. Les champs inconnus sont refusés.

Exemple de création après authentification :

```json
{
  "title": "API de paiement indisponible",
  "description": "Erreurs observées depuis 10h15",
  "severity": "high"
}
```

Exemple de changement d’état :

```json
{ "status": "investigating", "version": 1 }
```
