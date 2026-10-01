# AWS : runtime ECS Fargate

Template CloudFormation de référence, fourni mais non déployé. Il provisionne un ALB HTTPS, un service Fargate à deux tâches privées, logs CloudWatch, secret DB injecté, accès réseau DB et circuit breaker. Aucun droit AWS applicatif n’est accordé au rôle de tâche.

Prérequis existants : VPC, deux sous-réseaux publics et deux privés sur différentes zones, NAT ou endpoints privés nécessaires à ECR/Logs/Secrets, certificat ACM et DNS correspondant, ECR avec image immutable, PostgreSQL/RDS privé déjà migré et son security group. Le secret doit contenir directement une URL DATABASE_URL, avec les paramètres TLS et le certificat nécessaires à la validation du serveur. Une clé KMS personnalisée nécessite d’ajouter `kms:Decrypt` au rôle d’exécution sur cette clé seulement.

Créer l’image et la publier dans ECR avec les outils AWS authentifiés de l’opérateur. Exécuter les migrations avec une tâche ponctuelle disposant du réseau DB et d’une image de migration dédiée (target build avec scripts/migrations ajoutés) AVANT le service. Créer l’utilisateur initial par canal sécurisé, sans mot de passe dans les logs. Le template runtime ne fait pas ces étapes, ne crée pas RDS et n’active pas de sauvegardes.

```sh
aws cloudformation validate-template --template-body file://infra/aws-runtime.json
```

Examiner un change set avant déploiement. Utiliser ImageUri avec un digest, pas `latest`. La configuration peut entraîner des frais permanents ALB/Fargate/NAT/RDS. Elle n’est pas lancée automatiquement.

Les limites de débit sont par tâche ; utiliser WAF/limiteur partagé avant exposition publique sensible. Ajouter alarmes, règles de sortie réseau adaptées, sauvegardes RDS testées, image et actions CI épinglées par digest/SHA, scanner d’image et identité OIDC pour CI. Aucun secret AWS long terme n’est requis dans GitHub.

Le serveur ne fait pas confiance aux headers proxy par défaut : derrière l’ALB, le limiteur utilise l’adresse du proxy. Avant exposition publique, configurer un proxy de confiance limité à la topologie réelle ou déplacer la limitation en entrée ; ne pas activer aveuglément trustProxy=true.
