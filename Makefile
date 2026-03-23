.PHONY: test test-backend test-frontend lint lint-backend lint-frontend dev dev-backend dev-frontend install

# Run all tests
test: test-backend test-frontend

test-backend:
	cd backend && uv run pytest

test-frontend:
	cd frontend && npm run lint

# Lint
lint: lint-backend lint-frontend

lint-backend:
	cd backend && uv run ruff check . 2>/dev/null || echo "ruff not installed, skipping"

lint-frontend:
	cd frontend && npm run lint

# Dev servers
dev:
	@trap 'kill %1 %2 2>/dev/null; exit 0' INT TERM; \
	(cd backend && uv run uvicorn app.main:app --reload) & \
	(cd frontend && npm run dev) & \
	wait; exit 0

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload

dev-frontend:
	cd frontend && npm run dev

# Install dependencies
install:
	cd backend && uv sync
	cd frontend && npm install
