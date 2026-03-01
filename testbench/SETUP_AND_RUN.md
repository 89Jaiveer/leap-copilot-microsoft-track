# Testbench Setup and Run Guide

This guide is for judges and reviewers to reproduce the project behavior quickly.

## Prerequisites
- Python 3.11+
- Node.js 18+ (if frontend is enabled)
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

## 6) Frontend (if available)
```bash
cd frontend
npm install
npm run dev
```
Open the local URL shown in terminal.

## 7) Test Cases

### Case A: Normal Progress
- Mixed accuracy with recent improvement.
- Expected: lower-risk diagnosis and balanced plan.

### Case B: Inactivity Gap
- No activity for >14 days.
- Expected: inactivity decay detection and spaced recall tasks.

### Case C: Fast but Error-Prone
- Low response times with repeated wrong attempts.
- Expected: careless mistake diagnosis and verification drills.

## Notes
- This testbench uses non-PII synthetic or anonymized data.
- All outputs are deterministic-format JSON for reproducibility.
