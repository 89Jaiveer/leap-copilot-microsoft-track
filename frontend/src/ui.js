const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DIAGNOSIS_ICON_BY_TYPE = {
  concept_gap: "./assets/icons/concept-gap.svg",
  careless_mistakes: "./assets/icons/careless-mistakes.svg",
  time_pressure: "./assets/icons/time-pressure.svg",
  inactivity_decay: "./assets/icons/inactivity-decay.svg",
};

function initials(name) {
  if (!name) return "ST";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDate(value) {
  if (!value) return "Unknown";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function confidenceLabel(score) {
  if (score >= 0.85) return "High";
  if (score >= 0.7) return "Medium";
  return "Low";
}

function priorityClass(priority) {
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function calculateMonday(baseDate = new Date()) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekMap(recommendations = []) {
  const monday = calculateMonday();
  const map = DAYS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      day: label,
      date,
      entries: [],
    };
  });

  recommendations.forEach((rec) => {
    const idx = DAYS.indexOf(rec.scheduledDay);
    if (idx >= 0) {
      map[idx].entries.push(rec);
    }
  });
  return map;
}

export function renderSummary(summary) {
  if (!summary) return `<div class="error-banner">Summary data unavailable.</div>`;
  const metrics = summary.metrics || null;

  const diagnosisHtml = (summary.diagnoses || [])
    .map(
      (diagnosis) => `
      <article class="diagnosis-item">
        <div class="diagnosis-head">
          <img src="${DIAGNOSIS_ICON_BY_TYPE[diagnosis.type] || "./assets/icons/evidence.svg"}" alt="${diagnosis.label}" />
          <strong>${diagnosis.label}</strong>
        </div>
        <p>${diagnosis.detail}</p>
      </article>
    `
    )
    .join("");

  return `
    <div class="student-head">
      <div class="avatar">${initials(summary.studentName)}</div>
      <div>
        <h2>${summary.studentName}</h2>
        <p class="subtitle">${summary.studentId} | ${summary.gradeLevel || "Learner"}</p>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi">
        <span class="kpi-label">Overall Mastery</span>
        <div class="kpi-value">${summary.overallMastery}%</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Mastery Trend</span>
        <div class="kpi-value">${summary.masteryTrend || "N/A"}</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Study Minutes (7d)</span>
        <div class="kpi-value">${summary.weeklyStudyMinutes || 0}</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Risk Level</span>
        <div class="kpi-value ${summary.riskLevel === "High" ? "alert" : ""}">${summary.riskLevel || "N/A"}</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Streak</span>
        <div class="kpi-value">${summary.streakDays || 0} days</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Last Active</span>
        <div class="kpi-value">${formatDate(summary.lastActiveAt)}</div>
      </div>
      <div class="kpi">
        <span class="kpi-label">Recommendation ID</span>
        <div class="kpi-value">${summary.recommendationId || "N/A"}</div>
      </div>
    </div>

    ${
      metrics
        ? `
      <div>
        <h3>System Metrics</h3>
        <div class="kpis">
          <div class="kpi">
            <span class="kpi-label">Accept Rate</span>
            <div class="kpi-value">${Math.round((metrics.accept_rate || 0) * 100)}%</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Edit Rate</span>
            <div class="kpi-value">${Math.round((metrics.edit_rate || 0) * 100)}%</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Reject Rate</span>
            <div class="kpi-value">${Math.round((metrics.reject_rate || 0) * 100)}%</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Actionability</span>
            <div class="kpi-value">${Math.round((metrics.actionability_rate || 0) * 100)}%</div>
          </div>
          <div class="kpi">
            <span class="kpi-label">Explainability</span>
            <div class="kpi-value">${Math.round((metrics.explainability_coverage || 0) * 100)}%</div>
          </div>
        </div>
      </div>
    `
        : ""
    }

    <div>
      <h3>Diagnostic Signals</h3>
      <div class="diagnosis-list">${diagnosisHtml || `<p class="subtitle">No active diagnosis.</p>`}</div>
    </div>
  `;
}

export function renderPlanGrid(recommendations) {
  const weekMap = buildWeekMap(recommendations);
  return weekMap
    .map((slot) => {
      const pills = slot.entries.length
        ? slot.entries
            .map(
              (entry) =>
                `<div class="task-pill ${priorityClass(entry.priority)}">${entry.title.slice(0, 26)}${
                  entry.title.length > 26 ? "..." : ""
                }</div>`
            )
            .join("")
        : `<div class="subtitle">No task</div>`;

      return `
        <article class="day-slot">
          <header>
            <h4>${slot.day}</h4>
            <span class="date">${formatDate(slot.date)}</span>
          </header>
          ${pills}
        </article>
      `;
    })
    .join("");
}

export function renderRecommendations(recommendations, selectedId, overrides) {
  if (!recommendations?.length) {
    return `<div class="error-banner">No recommendations available.</div>`;
  }

  return recommendations
    .map((rec) => {
      const selectedClass = rec.id === selectedId ? "selected" : "";
      const override = overrides[rec.id];
      const overrideText = override
        ? `Overridden to ${override.day} (${override.minutes} min)`
        : `${rec.scheduledDay} | ${rec.estimatedMinutes} min`;
      const statusText =
        rec.status && rec.status !== "pending"
          ? `Status: ${rec.status[0].toUpperCase()}${rec.status.slice(1)}`
          : rec.expectedImpact || "Impact estimate unavailable.";

      return `
      <article class="recommendation-card ${selectedClass}" data-rec-id="${rec.id}">
        <div class="card-head">
          <h3>${rec.title}</h3>
          <span class="priority-badge ${priorityClass(rec.priority)}">${rec.priority}</span>
        </div>
        <p>${rec.objective}</p>
        <div class="card-meta">
          <span class="meta-chip">${overrideText}</span>
          <span class="meta-chip">Confidence ${Math.round((rec.confidence || 0) * 100)}%</span>
        </div>
        <p class="status-text">${statusText}</p>
        <div class="card-actions">
          <button type="button" class="secondary-btn" data-action="accept" data-rec-id="${rec.id}">Mark Accepted</button>
          <button type="button" class="ghost-btn" data-action="override" data-rec-id="${rec.id}">Edit</button>
          <button type="button" class="ghost-btn" data-action="dismiss" data-rec-id="${rec.id}">Dismiss</button>
        </div>
      </article>`;
    })
    .join("");
}

export function renderEvidence(recommendation, evidence) {
  if (!recommendation) {
    return `
      <h2>Why this recommendation?</h2>
      <p class="subtitle">Select a recommendation card to view evidence and confidence.</p>
    `;
  }

  if (!evidence) {
    return `
      <h2>Why this recommendation?</h2>
      <div class="error-banner">No evidence data available yet.</div>
    `;
  }

  const score = Math.round((recommendation.confidence || 0) * 100);
  const label = confidenceLabel(recommendation.confidence || 0);
  const signals = (evidence.signals || [])
    .map((signal) => `<li>${signal}</li>`)
    .join("");
  const metrics = (evidence.metrics || [])
    .map(
      (metric) => `
      <article class="metric">
        <span>${metric.label}</span>
        <strong>${metric.value}</strong>
        <span>${metric.trend || ""}</span>
      </article>
    `
    )
    .join("");
  const timeline = (evidence.timeline || [])
    .map(
      (item) => `
      <li>
        <div class="time">${item.ts}</div>
        <strong>${item.event}</strong>
        <p>${item.note}</p>
      </li>
    `
    )
    .join("");

  const actions = (recommendation.actions || []).map((step) => `<li>${step}</li>`).join("");

  return `
    <h2>Why this recommendation?</h2>
    <div class="evidence-box">
      <div class="confidence-row">
        <strong>Confidence: ${score}% (${label})</strong>
        <span>${recommendation.priority.toUpperCase()} priority</span>
      </div>
      <div class="confidence-meter"><span style="width: ${score}%"></span></div>
    </div>

    <div class="evidence-box">
      <h3>Evidence Signals</h3>
      <ul class="signal-list">${signals}</ul>
    </div>

    <div class="evidence-box">
      <h3>Supporting Metrics</h3>
      <div class="metric-grid">${metrics}</div>
    </div>

    <div class="evidence-box">
      <h3>Action Plan</h3>
      <ul class="signal-list">${actions}</ul>
    </div>

    <div class="evidence-box">
      <h3>Learning Timeline</h3>
      <ul class="timeline">${timeline}</ul>
    </div>
  `;
}

export function renderLoading(templateElement) {
  if (!templateElement?.content) return `<div class="subtitle">Loading...</div>`;
  return templateElement.innerHTML;
}
