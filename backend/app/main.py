from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import compute_metrics, init_db, insert_feedback, insert_recommendation
from .models import (
    AnalyzeRequest,
    FeedbackRequest,
    FeedbackResponse,
    LearningEvent,
    MetricsResponse,
)
from .pipeline import build_seven_day_plan

app = FastAPI(title="LEAP Copilot API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(payload: AnalyzeRequest):
    if not payload.events:
        raise HTTPException(status_code=400, detail="events cannot be empty")
    response = build_seven_day_plan(payload)
    recommendation_id = insert_recommendation(payload.student_id, response.model_dump())
    return response.model_copy(update={"recommendation_id": recommendation_id})


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
    response = build_seven_day_plan(request)
    recommendation_id = insert_recommendation(request.student_id, response.model_dump())
    return response.model_copy(update={"recommendation_id": recommendation_id})


@app.post("/feedback", response_model=FeedbackResponse)
def feedback(payload: FeedbackRequest):
    edited_json = json.dumps([item.model_dump() for item in payload.edited_plan]) if payload.edited_plan else None
    try:
        feedback_id = insert_feedback(
            recommendation_id=payload.recommendation_id,
            action=payload.action,
            note=payload.note,
            edited_json=edited_json,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err

    return FeedbackResponse(ok=True, feedback_id=feedback_id, recommendation_id=payload.recommendation_id)


@app.get("/metrics", response_model=MetricsResponse)
def metrics():
    return MetricsResponse(**compute_metrics())
