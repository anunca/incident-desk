.PHONY: install dev dev-setup dev-user up down check test-integration logs migrate
install:
	npm ci
dev: dev-setup
	NODE_ENV=development COOKIE_SECURE=false npm run dev
dev-setup:
	@test -f .env || cp .env.example .env
	npm ci
	docker compose up -d --wait db
	$(MAKE) migrate
	$(MAKE) dev-user
	npm run build:client
dev-user:
	NODE_ENV=development node --env-file-if-exists=.env --import tsx scripts/dev-user.ts
up:
	docker compose up --build -d
down:
	docker compose down
check:
	npm run check
test-integration:
	docker compose --profile test up -d --wait db-test
	DATABASE_URL=postgres://incident:local-test-only@127.0.0.1:5433/incidents_test npm run migrate
	TEST_DATABASE_URL=postgres://incident:local-test-only@127.0.0.1:5433/incidents_test npm run test:integration
logs:
	docker compose logs -f api
migrate:
	node --env-file-if-exists=.env --import tsx scripts/migrate.ts
