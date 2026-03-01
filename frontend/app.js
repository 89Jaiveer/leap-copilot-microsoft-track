const DEFAULT_REQUEST = {
  student_id: "student_001",
  daily_minutes: 45,
  events: [
    {
      student_id: "student_001",
      timestamp: "2026-02-25T08:00:00+00:00",
      question_id: "q100",
      concept_id: "algebra_linear",
      correct: 0,
      response_time_sec: 28,
      attempt_no: 1,
      difficulty: 0.55,
      source: "quiz",
    },
    {
      student_id: "student_001",
      timestamp: "2026-02-25T08:05:00+00:00",
      question_id: "q101",
      concept_id: "algebra_linear",
      correct: 1,
      response_time_sec: 20,
      attempt_no: 1,
      difficulty: 0.58,
      source: "quiz",
    },
  ],
};

const statusText = document.getElementById("statusText");
const conceptStates = document.getElementById("conceptStates");
const diagnosis = document.getElementById("diagnosis");
const plan = document.getElementById("plan");
const metricsPanel = document.getElementById("metricsPanel");
const cardTemplate = document.getElementById("cardTemplate");

const apiBaseInput = document.getElementById("apiBase");
const requestInput = document.getElementById("requestInput");
const latestRecommendation = document.getElementById("latestRecommendation");
const feedbackRecommendationId = document.getElementById("feedbackRecommendationId");
const feedbackAction = document.getElementById("feedbackAction");
const feedbackNote = document.getElementById("feedbackNote");

const metricActionability = document.getElementById("metricActionability");
const metricExplainability = document.getElementById("metricExplainability");

const healthBtn = document.getElementById("healthBtn");
const analyzeSampleBtn = document.getElementById("analyzeSampleBtn");
const analyzeCustomBtn = document.getElementById("analyzeCustomBtn");
const submitFeedbackBtn = document.getElementById("submitFeedbackBtn");
const metricsBtn = document.getElementById("metricsBtn");

requestInput.value = JSON.stringify(DEFAULT_REQUEST, null, 2);

function apiBase() {
  return apiBaseInput.value.trim().replace(/\/$/, "");
}

function setStatus(text) {
  statusText.textContent = text;
}

function clearPanels() {
  conceptStates.innerHTML = "";
  diagnosis.innerHTML = "";
  plan.innerHTML = "";
}

function renderEmpty(container, text) {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = text;
  container.appendChild(p);
}

function makeCard({ title, chip, body, evidence = [] }) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".card-title").textContent = title;
  node.querySelector(".chip").textContent = chip;
  node.querySelector(".card-body").textContent = body;

  const list = node.querySelector(".evidence");
  if (!evidence.length) {
    const item = document.createElement("li");
    item.textContent = "No evidence available";
    list.appendChild(item);
  } else {
    evidence.slice(0, 4).forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });
  }

  return node;
}

function renderResults(data) {
  clearPanels();

  if (data.recommendation_id) {
    latestRecommendation.textContent = String(data.recommendation_id);
    feedbackRecommendationId.value = String(data.recommendation_id);
  }

  if (!data.concept_states?.length) {
    renderEmpty(conceptStates, "No concept state data found.");
  } else {
    data.concept_states.forEach((item) => {
      conceptStates.appendChild(
        makeCard({
          title: item.concept_id,
          chip: `${Math.round(item.mastery_score * 100)}% mastery`,
          body: `Trend: ${item.trend} | Confidence: ${item.confidence}`,
          evidence: item.evidence,
        })
      );
    });
  }

  if (!data.diagnosis?.length) {
    renderEmpty(diagnosis, "No diagnosis output.");
  } else {
    data.diagnosis.forEach((item) => {
      diagnosis.appendChild(
        makeCard({
          title: item.concept_id,
          chip: `${item.cause} (${item.score})`,
          body: "Root-cause classification for planning.",
          evidence: item.evidence,
        })
      );
    });
  }

  if (!data.seven_day_plan?.length) {
    renderEmpty(plan, "No plan generated.");
  } else {
    data.seven_day_plan.forEach((item) => {
      plan.appendChild(
        makeCard({
          title: `Day ${item.day}: ${item.concept_id}`,
          chip: `${item.duration_min} min`,
          body: `${item.activity}. Expected: ${item.expected_outcome}`,
          evidence: item.evidence,
        })
      );
    });
  }
}

function renderMetrics(metrics) {
  metricsPanel.innerHTML = "";
  metricActionability.textContent = `${Math.round((metrics.actionability_rate ?? 0) * 100)}%`;
  metricExplainability.textContent = `${Math.round((metrics.explainability_coverage ?? 0) * 100)}%`;

  const entries = [
    ["Total recommendations", String(metrics.total_recommendations)],
    ["Total feedback", String(metrics.total_feedback)],
    ["Accept rate", `${Math.round((metrics.accept_rate ?? 0) * 100)}%`],
    ["Edit rate", `${Math.round((metrics.edit_rate ?? 0) * 100)}%`],
    ["Reject rate", `${Math.round((metrics.reject_rate ?? 0) * 100)}%`],
  ];

  entries.forEach(([name, value]) => {
    metricsPanel.appendChild(
      makeCard({
        title: name,
        chip: "metric",
        body: value,
        evidence: [],
      })
    );
  });
}

async function checkHealth() {
  setStatus("Checking API health...");
  try {
    const res = await fetch(`${apiBase()}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setStatus(`API healthy: ${data.status}`);
  } catch (err) {
    setStatus(`API health failed: ${err.message}. Ensure backend is running on ${apiBase()}.`);
  }
}

async function runAnalyze(path, body) {
  setStatus("Running analysis...");
  try {
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${apiBase()}${path}`, options);
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }

    const data = await res.json();
    renderResults(data);
    setStatus(data.summary || "Analysis complete.");
    await refreshMetrics();
  } catch (err) {
    clearPanels();
    setStatus(`Analysis failed: ${err.message}`);
  }
}

async function runSample() {
  await runAnalyze("/analyze/sample");
}

async function runCustom() {
  let payload;
  try {
    payload = JSON.parse(requestInput.value);
  } catch {
    setStatus("Invalid custom JSON payload. Fix it and retry.");
    return;
  }
  await runAnalyze("/analyze", payload);
}

async function submitFeedback() {
  const recommendationId = Number(feedbackRecommendationId.value);
  if (!recommendationId) {
    setStatus("Feedback failed: Recommendation ID is required.");
    return;
  }

  setStatus("Submitting feedback...");
  try {
    const payload = {
      recommendation_id: recommendationId,
      action: feedbackAction.value,
      note: feedbackNote.value || "",
    };

    const res = await fetch(`${apiBase()}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }

    const data = await res.json();
    setStatus(`Feedback saved (feedback_id=${data.feedback_id}).`);
    await refreshMetrics();
  } catch (err) {
    setStatus(`Feedback failed: ${err.message}`);
  }
}

async function refreshMetrics() {
  try {
    const res = await fetch(`${apiBase()}/metrics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderMetrics(data);
  } catch (err) {
    metricsPanel.innerHTML = "";
    renderEmpty(metricsPanel, `Metrics unavailable: ${err.message}`);
  }
}

healthBtn.addEventListener("click", checkHealth);
analyzeSampleBtn.addEventListener("click", runSample);
analyzeCustomBtn.addEventListener("click", runCustom);
submitFeedbackBtn.addEventListener("click", submitFeedback);
metricsBtn.addEventListener("click", refreshMetrics);

setStatus("Ready. Start backend API, then run sample or custom analysis.");
refreshMetrics();
