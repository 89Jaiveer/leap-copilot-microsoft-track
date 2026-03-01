# Testbench Setup and Run Guide

This guide is for judges and reviewers to reproduce the backend behavior quickly.

## Prerequisites
- Python 3.11+
- macOS/Linux terminal

## 1) Clone and Enter
```bash
git clone <YOUR_REPO_URL>
cd leap-copilot-microsoft-track
```

## 2) Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## 3) Run Backend
```bash
uvicorn backend.app.main:app --reload --port 8000
```

## 4) Verify Service
```bash
curl http://127.0.0.1:8000/health
```
Expected:
```json
{"status":"ok"}
```

## 5) Analyze Sample Data
```bash
curl -X POST http://127.0.0.1:8000/analyze/sample
```
Expected behavior:
- Returns concept states sorted by weakest first.
- Returns diagnosis entries with scores and evidence.
- Returns a 7-day plan with actionable tasks.

## 6) Example Direct Analyze Payload
```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d @data/request_example.json
```

## 7) Test Cases Covered by Sample
- Concept weakness with low accuracy and high response time
- Fast-but-error-prone behavior
- Inactivity decay from long study gap

## Notes
- This testbench uses non-PII synthetic data.
- Output is deterministic-format JSON for reproducibility.
