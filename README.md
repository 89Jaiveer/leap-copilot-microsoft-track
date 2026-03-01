# LEAP Copilot - Microsoft Track

LEAP Copilot is an AI-powered learning support system that models a student's evolving learning state and generates explainable, actionable weekly plans.

## Current Build Status
Implemented:
- Phase 1 backend MVP
- Phase 2 lightweight dashboard frontend

## API Endpoints
- `GET /health`
- `POST /analyze`
- `POST /analyze/sample`
- `POST /feedback`
- `GET /metrics`

## Quick Start
```bash
cd /Users/jaiveersinghkhanuja/Documents/Playground/leap-copilot-microsoft-track
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

In another terminal:
```bash
cd /Users/jaiveersinghkhanuja/Documents/Playground/leap-copilot-microsoft-track/frontend
python3 -m http.server 5173
```

Open:
- `http://127.0.0.1:5173`

Then test:
- `Check API Health`
- `Analyze Sample`

### Feedback + Metrics quick test
```bash
curl -X POST http://127.0.0.1:8000/feedback \
  -H "Content-Type: application/json" \
  -d '{"recommendation_id":1,"action":"accept","note":"Looks useful"}'

curl http://127.0.0.1:8000/metrics
```

## Repository Structure
- `backend/app/` API and analysis pipeline
- `frontend/` dashboard UI (HTML/CSS/JS)
- `data/` sample dataset and request JSON
- `docs/` architecture and competitive analysis
- `testbench/` grader run instructions

## Responsible AI Notes
- Recommendation outputs include explicit evidence fields.
- Output schema is deterministic and structured.
- Student actions are designed to be editable by humans in the next phase.
