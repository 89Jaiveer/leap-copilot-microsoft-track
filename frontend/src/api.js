import { config, resolveUrl } from "./config.js";
import { demoDashboard } from "./demo-data.js";

function withTimeout(promise, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    wrapped: promise(controller.signal).finally(() => clearTimeout(timer)),
  };
}

async function httpJson(url, options = {}) {
  const { controller, wrapped } = withTimeout(
    (signal) =>
      fetch(url, {
        ...options,
        signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      }),
    config.requestTimeoutMs
  );

  try {
    const response = await wrapped;
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`HTTP ${response.status} for ${url}: ${detail}`);
    }
    return await response.json();
  } finally {
    controller.abort();
  }
}

function weekdayFromDayIndex(day) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days[(day - 1 + 7) % 7] || "Mon";
}

function normalizeFromBackend(payload, studentId, metrics) {
  const conceptStates = payload.concept_states || [];
  const diagnosis = payload.diagnosis || [];
  const plan = payload.seven_day_plan || [];

  const overallMastery =
    conceptStates.length > 0
      ? Math.round((conceptStates.reduce((acc, c) => acc + Number(c.mastery_score || 0), 0) / conceptStates.length) * 100)
      : 0;

  const regressingCount = conceptStates.filter((c) => c.trend === "regressing").length;
  const riskLevel = regressingCount >= 2 ? "High" : regressingCount === 1 ? "Moderate" : "Low";

  const summary = {
    studentId,
    studentName: `Student ${studentId}`,
    gradeLevel: "Hackathon Demo",
    overallMastery,
    masteryTrend: conceptStates.map((c) => c.trend).join(" / ") || "N/A",
    weeklyStudyMinutes: plan.reduce((acc, t) => acc + Number(t.duration_min || 0), 0),
    streakDays: Math.max(1, 7 - Math.max(...conceptStates.map((c) => Number(c.inactivity_days || 0), 0))),
    riskLevel,
    lastActiveAt: new Date().toISOString(),
    recommendationId: payload.recommendation_id || null,
    metrics: metrics || null,
    diagnoses: diagnosis.map((d) => ({
      type: d.cause,
      label: d.cause.replaceAll("_", " "),
      detail: (d.evidence || []).slice(0, 2).join(" | "),
    })),
  };

  const recommendations = plan.map((item, index) => {
    const matchingDiagnosis = diagnosis.find((d) => d.concept_id === item.concept_id);
    return {
      id: `rec-${index + 1}`,
      backendRecommendationId: payload.recommendation_id || null,
      title: item.activity,
      objective: `Focus concept: ${item.concept_id}`,
      priority: (matchingDiagnosis?.score || 0) > 0.75 ? "high" : (matchingDiagnosis?.score || 0) > 0.6 ? "medium" : "low",
      estimatedMinutes: item.duration_min,
      scheduledDay: weekdayFromDayIndex(item.day),
      scheduledDate: null,
      confidence: Number(item.confidence || 0.7),
      expectedImpact: item.expected_outcome,
      actions: [item.activity, `Expected: ${item.expected_outcome}`],
      status: "pending",
      evidence: {
        signals: item.evidence || [],
        metrics: [
          { label: "Plan confidence", value: `${Math.round((item.confidence || 0) * 100)}%`, trend: "current" },
          {
            label: "Diagnosis score",
            value: matchingDiagnosis ? `${Math.round((matchingDiagnosis.score || 0) * 100)}%` : "N/A",
            trend: "current",
          },
          { label: "Duration", value: `${item.duration_min} min`, trend: "scheduled" },
          { label: "Concept", value: item.concept_id, trend: "target" },
        ],
        timeline: [
          {
            ts: new Date().toISOString().slice(0, 16).replace("T", " "),
            event: `Day ${item.day} task generated`,
            note: item.expected_outcome,
          },
        ],
      },
    };
  });

  return {
    summary,
    recommendations,
    usingDemoData: false,
  };
}

async function fetchMetricsSafe() {
  try {
    return await httpJson(resolveUrl(config.endpoints.metrics));
  } catch (_err) {
    return null;
  }
}

export async function loadLearningState(studentId) {
  try {
    const metrics = await fetchMetricsSafe();
    const analyze = await httpJson(resolveUrl(config.endpoints.analyzeSample), { method: "POST" });
    return normalizeFromBackend(analyze, studentId, metrics);
  } catch (_error) {
    return {
      ...demoDashboard,
      usingDemoData: true,
    };
  }
}

export async function loadExplanation(_studentId, _recommendationId) {
  return null;
}

export async function saveOverride(_studentId, recommendationId, payload) {
  const backendRecommendationId = Number(recommendationId);
  const note = payload.note || "User override submitted";

  try {
    if (!backendRecommendationId) {
      throw new Error("Missing backend recommendation id");
    }
    return await httpJson(resolveUrl(config.endpoints.feedback), {
      method: "POST",
      body: JSON.stringify({
        recommendation_id: backendRecommendationId,
        action: "edit",
        note: `${note} | day=${payload.day} | minutes=${payload.minutes}`,
      }),
    });
  } catch (_error) {
    return {
      savedLocally: true,
      day: payload.day,
      minutes: payload.minutes,
      note,
      savedAt: new Date().toISOString(),
    };
  }
}

export async function sendFeedback(recommendationId, action, note) {
  return await httpJson(resolveUrl(config.endpoints.feedback), {
    method: "POST",
    body: JSON.stringify({
      recommendation_id: recommendationId,
      action,
      note,
    }),
  });
}
