from __future__ import annotations

from datetime import UTC, datetime

from .engine import compute_concept_states, diagnose
from .models import AnalyzeRequest, AnalyzeResponse, DailyTask


def _activity_for_cause(cause: str) -> tuple[str, str]:
    if cause == "concept_gap":
        return (
            "Concept rebuild: 2 worked examples + 5 targeted questions",
            "Raise conceptual clarity and reduce repeated misunderstandings",
        )
    if cause == "careless_mistakes":
        return (
            "Accuracy drill: slow-pass checklist + error log review",
            "Reduce avoidable mistakes through deliberate verification",
        )
    if cause == "time_pressure":
        return (
            "Timed micro-quiz (8-10 min) + reflection",
            "Improve speed-accuracy balance under constrained time",
        )
    return (
        "Spaced recall restart: summary + retrieval practice",
        "Recover forgotten knowledge after inactivity",
    )


def build_seven_day_plan(request: AnalyzeRequest) -> AnalyzeResponse:
    states = compute_concept_states(request.events)
    diagnosis = diagnose(states)

    plan: list[DailyTask] = []
    if diagnosis:
        top = diagnosis[: min(3, len(diagnosis))]
        daily_budget = max(request.daily_minutes, 15)

        for day in range(1, 8):
            current = top[(day - 1) % len(top)]
            activity, outcome = _activity_for_cause(current.cause)
            duration = min(max(15, daily_budget // len(top)), 60)
            plan.append(
                DailyTask(
                    day=day,
                    concept_id=current.concept_id,
                    activity=activity,
                    duration_min=duration,
                    expected_outcome=outcome,
                    confidence=round(max(0.5, current.score), 3),
                    evidence=current.evidence[:4],
                )
            )

    normalized: list[DailyTask] = []
    for item in sorted(plan, key=lambda x: x.day):
        evidence = item.evidence if item.evidence else ["insufficient_evidence_fallback"]
        normalized.append(item.model_copy(update={"evidence": evidence[:4]}))

    summary = (
        f"Analyzed {len(request.events)} events across {len(states)} concepts. "
        f"Generated {len(normalized)} daily tasks with explicit evidence links."
    )

    return AnalyzeResponse(
        student_id=request.student_id,
        generated_at=datetime.now(UTC),
        concept_states=states,
        diagnosis=diagnosis,
        seven_day_plan=normalized,
        summary=summary,
    )
