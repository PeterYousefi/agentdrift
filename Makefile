.PHONY: setup api web test evaluate
setup:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -e './backend[test]'
	cd lovable && npm ci
api:
	backend/.venv/bin/uvicorn app.main:app --reload --port 8000
web:
	cd lovable && npm run dev -- --port 3000
test:
	backend/.venv/bin/pytest backend/tests -q
	backend/.venv/bin/ruff check backend/app backend/tests
	cd lovable && npm test && npm run lint && npx tsc --noEmit
evaluate:
	backend/.venv/bin/python -m app.evaluation
