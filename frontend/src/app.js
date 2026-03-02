import { loadExplanation, loadLearningState, saveOverride, sendFeedback } from "./api.js";
import { renderEvidence, renderLoading, renderPlanGrid, renderRecommendations, renderSummary } from "./ui.js";

const elements = {
  studentInput: document.getElementById("student-id-input"),
  refreshBtn: document.getElementById("refresh-btn"),
  summaryPanel: document.getElementById("summary-panel"),
  recommendationsList: document.getElementById("recommendations-list"),
  evidencePanel: document.getElementById("evidence-panel"),
  planGrid: document.getElementById("plan-grid"),
  loadingTemplate: document.getElementById("loading-template"),
  modeChip: document.getElementById("mode-chip"),
  overrideDialog: document.getElementById("override-dialog"),
  overrideForm: document.getElementById("override-form"),
  overrideDay: document.getElementById("override-day"),
  overrideMinutes: document.getElementById("override-minutes"),
  overrideNote: document.getElementById("override-note"),
  cancelOverrideBtn: document.getElementById("cancel-override-btn"),
};

const state = {
  studentId: elements.studentInput?.value || "S-1024",
  summary: null,
  recommendations: [],
  selectedRecommendationId: null,
  evidenceById: {},
  overrides: {},
  activeOverrideId: null,
  usingDemoData: false,
};

function applyAriaBusy(isBusy) {
  ["summaryPanel", "recommendationsList", "evidencePanel", "planGrid"].forEach((key) => {
    const target = elements[key];
    if (target) {
      target.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
  });
}

function renderAll() {
  elements.summaryPanel.innerHTML = renderSummary(state.summary);
  elements.planGrid.innerHTML = renderPlanGrid(state.recommendations);
  elements.recommendationsList.innerHTML = renderRecommendations(
    state.recommendations,
    state.selectedRecommendationId,
    state.overrides
  );

  const selected = state.recommendations.find((rec) => rec.id === state.selectedRecommendationId) || null;
  const evidence = selected ? state.evidenceById[selected.id] || selected.evidence || null : null;
  elements.evidencePanel.innerHTML = renderEvidence(selected, evidence);

  elements.modeChip.classList.toggle("hidden", !state.usingDemoData);
}

function setLoading() {
  const loading = renderLoading(elements.loadingTemplate);
  elements.summaryPanel.innerHTML = loading;
  elements.planGrid.innerHTML = loading;
  elements.recommendationsList.innerHTML = loading;
  elements.evidencePanel.innerHTML = loading;
}

async function loadData() {
  state.studentId = elements.studentInput.value.trim() || "S-1024";
  state.evidenceById = {};
  state.overrides = {};
  applyAriaBusy(true);
  setLoading();

  try {
    const result = await loadLearningState(state.studentId);
    state.summary = result.summary;
    state.recommendations = result.recommendations || [];
    state.usingDemoData = Boolean(result.usingDemoData);
    state.selectedRecommendationId = state.recommendations[0]?.id || null;

    if (state.selectedRecommendationId) {
      const evidence = await loadExplanation(state.studentId, state.selectedRecommendationId);
      state.evidenceById[state.selectedRecommendationId] = evidence;
    }
    renderAll();
  } catch (error) {
    elements.summaryPanel.innerHTML = `<div class="error-banner">Could not load summary: ${error.message}</div>`;
    elements.recommendationsList.innerHTML = `<div class="error-banner">Could not load recommendations.</div>`;
    elements.evidencePanel.innerHTML = `<div class="error-banner">Could not load evidence.</div>`;
    elements.planGrid.innerHTML = `<div class="error-banner">Could not load 7-day plan.</div>`;
  } finally {
    applyAriaBusy(false);
  }
}

async function selectRecommendation(recId) {
  if (!recId || state.selectedRecommendationId === recId) return;
  state.selectedRecommendationId = recId;
  renderAll();
  if (!state.evidenceById[recId]) {
    const evidence = await loadExplanation(state.studentId, recId);
    state.evidenceById[recId] = evidence;
    renderAll();
  }
}

async function handleActionClick(target) {
  const recId = target.dataset.recId;
  const action = target.dataset.action;
  if (!recId || !action) return;

  const recommendation = state.recommendations.find((rec) => rec.id === recId);
  if (!recommendation) return;

  if (action === "accept") {
    if (recommendation.backendRecommendationId) {
      await sendFeedback(
        recommendation.backendRecommendationId,
        "accept",
        `Accepted: ${recommendation.title}`
      );
    }
    recommendation.status = "accepted";
    renderAll();
    return;
  }

  if (action === "dismiss") {
    if (recommendation.backendRecommendationId) {
      await sendFeedback(
        recommendation.backendRecommendationId,
        "reject",
        `Rejected: ${recommendation.title}`
      );
    }
    recommendation.status = "dismissed";
    renderAll();
    return;
  }

  if (action === "override") {
    state.activeOverrideId = recId;
    const override = state.overrides[recId];
    elements.overrideDay.value = override?.day || recommendation.scheduledDay || "Mon";
    elements.overrideMinutes.value = override?.minutes || recommendation.estimatedMinutes || 30;
    elements.overrideNote.value = override?.note || "";
    elements.overrideDialog.showModal();
  }
}

function bindEvents() {
  elements.refreshBtn.addEventListener("click", loadData);
  elements.studentInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loadData();
    }
  });

  elements.recommendationsList.addEventListener("click", async (event) => {
    const actionTarget = event.target.closest("button[data-action]");
    if (actionTarget) {
      event.stopPropagation();
      await handleActionClick(actionTarget);
      return;
    }

    const card = event.target.closest(".recommendation-card");
    if (!card) return;
    await selectRecommendation(card.dataset.recId);
  });

  elements.cancelOverrideBtn.addEventListener("click", () => {
    elements.overrideDialog.close();
  });

  elements.overrideForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const recId = state.activeOverrideId;
    if (!recId) return;

    const payload = {
      day: elements.overrideDay.value,
      minutes: Number(elements.overrideMinutes.value),
      note: elements.overrideNote.value.trim(),
    };

    if (!payload.note) return;

    const recommendation = state.recommendations.find((rec) => rec.id === recId);
    const result = await saveOverride(
      state.studentId,
      recommendation?.backendRecommendationId || recId,
      payload
    );
    state.overrides[recId] = payload;

    if (recommendation) {
      recommendation.scheduledDay = payload.day;
      recommendation.estimatedMinutes = payload.minutes;
      recommendation.status = "overridden";
      recommendation.overrideMeta = result;
    }

    elements.overrideDialog.close();
    renderAll();
  });
}

bindEvents();
loadData();
