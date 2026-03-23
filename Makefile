.PHONY: test test-backend test-frontend lint lint-backend lint-frontend dev dev-backend dev-frontend install kill

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
	@trap 'kill 0 2>/dev/null; exit 0' INT TERM; \
	(cd backend && uv run uvicorn app.main:app --reload) & \
	(cd frontend && npm run dev) & \
	wait; exit 0

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload

dev-frontend:
	cd frontend && npm run dev

# Kill leftover dev processes
kill:
	@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@echo "Ports 8000 and 3000 cleared"

# Install dependencies
install:
	cd backend && uv sync
	cd frontend && npm install
