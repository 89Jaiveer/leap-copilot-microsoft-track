# LEAP Copilot - Microsoft Track

LEAP Copilot is an AI-powered learning support system that models a student's evolving learning state and generates explainable, actionable weekly plans.

## Problem
Students produce rich learning interaction data (attempts, scores, timestamps, topics, response times), but most platforms do not convert this into trustworthy, personalized decisions.

## Our Solution
LEAP Copilot combines:
- Learning-state modeling over time (mastery + trends)
- Root-cause diagnosis of performance issues
- Personalized 7-day study plans constrained by time budget
- Transparent recommendation evidence and confidence
- Responsible AI controls (determinism, explainability, human override)

## Why This Matters
The system is designed for real learning behavior: non-linear progress, inactivity gaps, and changing mastery.

## Core Capabilities
1. Ingests student events (`question`, `concept`, `timestamp`, `correct`, `response time`, `difficulty`).
2. Computes concept-level state:
- mastery score
- trend (`improving`, `stagnant`, `regressing`)
- inactivity risk
3. Diagnoses likely causes:
- concept gap
- careless mistakes
- time pressure
- inactivity decay
4. Generates a 7-day actionable plan with:
- daily tasks
- duration
- expected outcome
- confidence score
- evidence links
5. Enables human agency:
- accept/edit/reject recommendations

## Responsible AI Principles
- Explainability: each recommendation includes supporting evidence.
- Consistency: deterministic output schema and policy checks.
- Fairness: behavior-cohort checks for recommendation intensity.
- Privacy: pseudonymous student IDs and minimal data fields.
- Human override: users can edit or reject the plan.

## Tech Stack (Planned)
- Frontend: React (or Gradio fallback for fast demo)
- Backend: FastAPI (Python)
- Data: SQLite (hackathon), optional Azure storage
- AI Layer: Azure OpenAI + optional local fallback
- Retrieval: Azure AI Search (RAG)
- Deploy: Azure Functions / Azure Container Apps

## Repository Structure
- `backend/` API, learning engine, agent orchestration
- `frontend/` dashboard and explanation UI
- `data/` sample/synthetic datasets
- `docs/` architecture and competitive analysis
- `testbench/` reproducibility setup for judges
- `scripts/` helper scripts for run/test

## Judging Alignment
- Innovation & Creativity: diagnosis + planning + checker agent pattern.
- Technical Implementation: modular architecture and explainable outputs.
- Impact & Viability: longitudinal adaptation to realistic learning patterns.
- Presentation & Documentation: explicit rationale, tests, and evidence.
