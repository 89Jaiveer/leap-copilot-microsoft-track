# LEAP Copilot - Microsoft Track

LEAP Copilot is an AI-powered learning support system that models a student's evolving learning state and generates explainable, actionable weekly plans.

## Current Build Status
Phase 1 backend MVP is implemented:
- event ingestion endpoint
- learning-state engine
- diagnosis engine
- 7-day planner
- sample analysis endpoint

## API Endpoints
- `GET /health`
- `POST /analyze`
- `POST /analyze/sample`

## Quick Start
```bash
cd /Users/jaiveersinghkhanuja/Documents/Playground/leap-copilot-microsoft-track
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Test:
```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/analyze/sample
```

## Repository Structure
- `backend/app/` API and analysis pipeline
- `data/` sample dataset
- `docs/` architecture and competitive analysis
- `testbench/` grader run instructions

## Responsible AI Notes
- Recommendation outputs include explicit evidence fields.
- Output schema is deterministic and structured.
- Student actions are designed to be editable by humans in UI phase.
