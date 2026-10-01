# ADR 001 — Sessions opaques révocables

Décision : token aléatoire de 256 bits, empreinte SHA-256 stockée en base, durée fixe de huit heures. Les mots de passe utilisent scrypt avec un sel aléatoire et les paramètres explicites N=32768, r=8, p=3 (mémoire maximale 64 Mio par dérivation). Un utilisateur inconnu déclenche également une dérivation pour réduire les différences temporelles évidentes.

Motivation : révocation immédiate, absence de secret JWT global et moindre complexité pour une application unique. Coût : une lecture DB par requête authentifiée. Les sessions expirées sont supprimées périodiquement par exploitation. Le token retourné pour les clients API doit être traité comme un secret.

Un produit réel privilégierait souvent un fournisseur OIDC avec MFA et une politique de sessions adaptée à son niveau de risque.
