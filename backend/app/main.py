from __future__ import annotations

import csv
import json
import re
from datetime import datetime
from html import unescape
from pathlib import Path
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import compute_metrics, get_user, init_db, insert_feedback, insert_recommendation, upsert_user
from .models import (
    AnalyzeRequest,
    FeedbackRequest,
    FeedbackResponse,
    LearningEvent,
    MetricsResponse,
    UserProfile,
    UserRegisterRequest,
    YouTubeSearchResponse,
    YouTubeVideo,
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


@app.post("/users/register", response_model=UserProfile)
def register_user(payload: UserRegisterRequest):
    user = upsert_user(payload.school_id.strip(), payload.name.strip())
    return UserProfile(**user)


@app.get("/users/{school_id}", response_model=UserProfile)
def fetch_user(school_id: str):
    user = get_user(school_id.strip())
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    return UserProfile(**user)


def _extract_youtube_results(html: str, limit: int) -> list[YouTubeVideo]:
    blocks = re.findall(r'"videoRenderer":\\{(.*?)\\}\\}\\],\"trackingParams\"', html)
    results: list[YouTubeVideo] = []
    seen: set[str] = set()

    for block in blocks:
        video_id_match = re.search(r'"videoId":"([^"]+)"', block)
        if not video_id_match:
            continue
        video_id = video_id_match.group(1)
        if video_id in seen:
            continue

        title_match = re.search(r'"title":\\{\"runs\":\\[\\{\"text\":\"([^"]+)"', block)
        if not title_match:
            title_match = re.search(r'"title":\\{\"simpleText\":\"([^"]+)"', block)
        channel_match = re.search(r'"ownerText":\\{\"runs\":\\[\\{\"text\":\"([^"]+)"', block)
        duration_match = re.search(r'"lengthText":\\{\"simpleText\":\"([^"]+)"', block)

        title = unescape(title_match.group(1) if title_match else "Untitled video")
        channel = unescape(channel_match.group(1) if channel_match else "YouTube")
        duration = duration_match.group(1) if duration_match else None
        seen.add(video_id)

        results.append(
            YouTubeVideo(
                video_id=video_id,
                title=title,
                channel=channel,
                duration=duration,
                url=f"https://www.youtube.com/watch?v={video_id}",
                thumbnail=f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            )
        )
        if len(results) >= limit:
            break

    return results


@app.get("/youtube/search", response_model=YouTubeSearchResponse)
def youtube_search(q: str, limit: int = 6):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query cannot be empty")

    safe_limit = max(1, min(limit, 10))
    search_url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"

    request = Request(
        search_url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )

    try:
        with urlopen(request, timeout=12) as response:
            raw_html = response.read().decode("utf-8", errors="ignore")
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"YouTube fetch failed: {err}") from err

    results = _extract_youtube_results(raw_html, safe_limit)
    return YouTubeSearchResponse(query=query, results=results)


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
