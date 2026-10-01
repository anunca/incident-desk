.PHONY: install dev up down check test-integration logs migrate
install:
	npm ci
dev:
	node --env-file=.env --import tsx src/server.ts
up:
	docker compose up --build -d
down:
	docker compose down
check:
	npm run check
test-integration:
	npm run test:integration
logs:
	docker compose logs -f api
migrate:
	node --env-file=.env --import tsx scripts/migrate.ts
