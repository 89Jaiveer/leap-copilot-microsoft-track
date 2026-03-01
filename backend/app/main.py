from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException

from .models import AnalyzeRequest, LearningEvent
from .pipeline import build_seven_day_plan

app = FastAPI(title="LEAP Copilot API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    if not payload.events:
        raise HTTPException(status_code=400, detail="events cannot be empty")
    return build_seven_day_plan(payload)


@app.post("/analyze/sample")
def analyze_sample():
    root = Path(__file__).resolve().parents[2]
    sample_csv = root / "data" / "sample_events.csv"
    if not sample_csv.exists():
        raise HTTPException(status_code=404, detail="sample data not found")

    events: list[LearningEvent] = []
    with sample_csv.open("r", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            events.append(
                LearningEvent(
                    student_id=row["student_id"],
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                    question_id=row["question_id"],
                    concept_id=row["concept_id"],
                    correct=int(row["correct"]),
                    response_time_sec=float(row["response_time_sec"]),
                    attempt_no=int(row["attempt_no"]),
                    difficulty=float(row["difficulty"]),
                    source=row["source"],
                )
            )

    request = AnalyzeRequest(student_id="student_001", daily_minutes=45, events=events)
    return build_seven_day_plan(request)
