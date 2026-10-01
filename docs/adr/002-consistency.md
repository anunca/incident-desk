# ADR 002 — Transactions et version explicite

Décision : transaction avec `SELECT ... FOR UPDATE`, comparaison de version, changement d’état et événement d’audit atomiques. Isolation PostgreSQL par défaut READ COMMITTED.

Motivation : aucune modification silencieusement perdue ; audit cohérent avec l’état. Les verrous sont courts et portent sur un incident. Les tests exécutent deux mutations simultanées et forcent une violation de clé étrangère pendant l’audit pour vérifier le rollback.

Limite : l’audit est append-only au niveau de l’application, mais l’identité SQL de démonstration possède plus de droits. Un environnement réglementé nécessite des comptes distincts et une archive externe protégée.
