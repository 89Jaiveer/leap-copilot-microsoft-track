const state = {
  apiBase: "http://127.0.0.1:8000",
  user: null,
  modules: [],
  events: [],
  latestRecommendationId: null,
  lastAnalysis: null,
};

const el = {
  apiBase: document.getElementById("apiBase"),
  statusText: document.getElementById("statusText"),
  schoolId: document.getElementById("schoolId"),
  studentName: document.getElementById("studentName"),
  accountInfo: document.getElementById("accountInfo"),
  moduleInput: document.getElementById("moduleInput"),
  moduleList: document.getElementById("moduleList"),
  eventConcept: document.getElementById("eventConcept"),
  eventCorrect: document.getElementById("eventCorrect"),
  eventRt: document.getElementById("eventRt"),
  eventDifficulty: document.getElementById("eventDifficulty"),
  eventAttempt: document.getElementById("eventAttempt"),
  eventTableWrap: document.getElementById("eventTableWrap"),
  dailyMinutes: document.getElementById("dailyMinutes"),
  conceptStates: document.getElementById("conceptStates"),
  diagnosis: document.getElementById("diagnosis"),
  plan: document.getElementById("plan"),
  metrics: document.getElementById("metrics"),
};

const btn = {
  health: document.getElementById("healthBtn"),
  register: document.getElementById("registerBtn"),
  addModule: document.getElementById("addModuleBtn"),
  addEvent: document.getElementById("addEventBtn"),
  clearEvents: document.getElementById("clearEventsBtn"),
  analyze: document.getElementById("analyzeBtn"),
  metrics: document.getElementById("metricsBtn"),
};

function setStatus(text) {
  el.statusText.textContent = text;
}

function api(path) {
  return `${state.apiBase.replace(/\/$/, "")}${path}`;
}

async function jsonFetch(path, options = {}) {
  const res = await fetch(api(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

function saveLocal() {
  localStorage.setItem("leap_user", JSON.stringify(state.user));
  localStorage.setItem("leap_modules", JSON.stringify(state.modules));
  localStorage.setItem("leap_events", JSON.stringify(state.events));
}

function loadLocal() {
  try {
    const user = JSON.parse(localStorage.getItem("leap_user") || "null");
    const modules = JSON.parse(localStorage.getItem("leap_modules") || "[]");
    const events = JSON.parse(localStorage.getItem("leap_events") || "[]");
    if (user) state.user = user;
    state.modules = Array.isArray(modules) ? modules : [];
    state.events = Array.isArray(events) ? events : [];
  } catch {
    // ignore corrupted local state
  }
}

function renderAccount() {
  if (!state.user) {
    el.accountInfo.textContent = "Not signed in";
    return;
  }
  el.accountInfo.textContent = `${state.user.name} (${state.user.school_id})`;
  el.schoolId.value = state.user.school_id;
  el.studentName.value = state.user.name;
}

function renderModules() {
  el.moduleList.innerHTML = "";
  if (!state.modules.length) {
    el.moduleList.innerHTML = '<span class="muted">No modules added yet.</span>';
  } else {
    state.modules.forEach((m) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = m;
      el.moduleList.appendChild(chip);
    });
  }

  el.eventConcept.innerHTML = "";
  state.modules.forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    el.eventConcept.appendChild(option);
  });
}

function renderEvents() {
  if (!state.events.length) {
    el.eventTableWrap.innerHTML = '<p class="muted">No study logs yet.</p>';
    return;
  }

  const rows = state.events
    .map(
      (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.concept_id}</td>
        <td>${e.correct ? "Yes" : "No"}</td>
        <td>${e.response_time_sec}</td>
        <td>${e.difficulty}</td>
        <td>${e.attempt_no}</td>
        <td><button class="btn ghost" data-remove="${i}">Remove</button></td>
      </tr>`
    )
    .join("");

  el.eventTableWrap.innerHTML = `
    <table>
      <thead>
        <tr><th>#</th><th>Concept</th><th>Correct</th><th>RT(s)</th><th>Difficulty</th><th>Attempt</th><th>Action</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  el.eventTableWrap.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.remove);
      state.events.splice(idx, 1);
      saveLocal();
      renderEvents();
    });
  });
}

function renderList(container, items, formatter) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p class="muted">No data yet.</p>';
    return;
  }
  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = formatter(item);
    container.appendChild(div);
  });
}

function feedbackButtons(recommendationId) {
  return `
    <div class="row">
      <button class="btn" data-feedback="accept" data-rec="${recommendationId}">Accept</button>
      <button class="btn ghost" data-feedback="edit" data-rec="${recommendationId}">Edit</button>
      <button class="btn ghost" data-feedback="reject" data-rec="${recommendationId}">Reject</button>
    </div>`;
}

function renderAnalysis(data) {
  state.lastAnalysis = data;
  state.latestRecommendationId = data.recommendation_id;

  renderList(el.conceptStates, data.concept_states || [], (c) => {
    const badgeClass = c.trend === "improving" ? "badge-good" : c.trend === "regressing" ? "badge-bad" : "badge-warn";
    return `<strong>${c.concept_id}</strong><div class="muted">Mastery ${Math.round(c.mastery_score * 100)}% | <span class="${badgeClass}">${c.trend}</span></div><div class="muted">${c.evidence.join(" | ")}</div>`;
  });

  renderList(el.diagnosis, data.diagnosis || [], (d) => {
    return `<strong>${d.concept_id}</strong><div class="muted">Cause: ${d.cause} | Score: ${Math.round(d.score * 100)}%</div><div class="muted">${(d.evidence || []).slice(0,3).join(" | ")}</div>`;
  });

  el.plan.innerHTML = "";
  (data.seven_day_plan || []).forEach((task) => {
    const card = document.createElement("div");
    card.className = "plan-card";
    card.innerHTML = `
      <div class="plan-head"><strong>Day ${task.day} - ${task.concept_id}</strong><span class="tag">${task.duration_min} min</span></div>
      <p>${task.activity}</p>
      <p class="muted">${task.expected_outcome}</p>
      <p class="muted">Evidence: ${(task.evidence || []).join(" | ")}</p>
      ${feedbackButtons(data.recommendation_id)}
    `;
    el.plan.appendChild(card);
  });

  el.plan.querySelectorAll("button[data-feedback]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.feedback;
      const recommendationId = Number(button.dataset.rec);
      const note = prompt(`Add note for ${action}:`, `${action} by ${state.user?.name || "user"}`) || "";
      try {
        await jsonFetch("/feedback", {
          method: "POST",
          body: JSON.stringify({
            recommendation_id: recommendationId,
            action,
            note,
          }),
        });
        setStatus(`Feedback submitted: ${action}.`);
        await refreshMetrics();
      } catch (err) {
        setStatus(`Feedback failed: ${err.message}`);
      }
    });
  });
}

async function refreshMetrics() {
  try {
    const m = await jsonFetch("/metrics");
    el.metrics.innerHTML = `
      <div class="metric"><span>Total Recommendations</span><strong>${m.total_recommendations}</strong></div>
      <div class="metric"><span>Total Feedback</span><strong>${m.total_feedback}</strong></div>
      <div class="metric"><span>Accept Rate</span><strong>${Math.round(m.accept_rate * 100)}%</strong></div>
      <div class="metric"><span>Edit Rate</span><strong>${Math.round(m.edit_rate * 100)}%</strong></div>
      <div class="metric"><span>Reject Rate</span><strong>${Math.round(m.reject_rate * 100)}%</strong></div>
      <div class="metric"><span>Actionability</span><strong>${Math.round(m.actionability_rate * 100)}%</strong></div>
      <div class="metric"><span>Explainability</span><strong>${Math.round(m.explainability_coverage * 100)}%</strong></div>
    `;
  } catch (err) {
    el.metrics.innerHTML = `<p class="muted">Metrics unavailable: ${err.message}</p>`;
  }
}

btn.health.addEventListener("click", async () => {
  state.apiBase = el.apiBase.value.trim();
  try {
    const health = await jsonFetch("/health");
    setStatus(`Backend healthy: ${health.status}`);
  } catch (err) {
    setStatus(`Health check failed: ${err.message}`);
  }
});

btn.register.addEventListener("click", async () => {
  state.apiBase = el.apiBase.value.trim();
  const schoolId = el.schoolId.value.trim();
  const name = el.studentName.value.trim();
  if (!schoolId || !name) {
    setStatus("Enter school ID and name.");
    return;
  }

  try {
    const user = await jsonFetch("/users/register", {
      method: "POST",
      body: JSON.stringify({ school_id: schoolId, name }),
    });
    state.user = user;
    saveLocal();
    renderAccount();
    setStatus(`Signed in as ${user.name}.`);
  } catch (err) {
    setStatus(`Registration failed: ${err.message}`);
  }
});

btn.addModule.addEventListener("click", () => {
  const module = el.moduleInput.value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!module) {
    setStatus("Module cannot be empty.");
    return;
  }
  if (!state.modules.includes(module)) {
    state.modules.push(module);
    saveLocal();
    renderModules();
  }
  el.moduleInput.value = "";
});

btn.addEvent.addEventListener("click", () => {
  if (!state.user) {
    setStatus("Create account first.");
    return;
  }
  if (!state.modules.length) {
    setStatus("Add at least one module first.");
    return;
  }

  const event = {
    student_id: state.user.school_id,
    timestamp: new Date().toISOString(),
    question_id: `q_${Date.now()}`,
    concept_id: el.eventConcept.value,
    correct: Number(el.eventCorrect.value),
    response_time_sec: Number(el.eventRt.value),
    attempt_no: Number(el.eventAttempt.value),
    difficulty: Number(el.eventDifficulty.value),
    source: "user_app",
  };

  state.events.push(event);
  saveLocal();
  renderEvents();
  setStatus("Log entry added.");
});

btn.clearEvents.addEventListener("click", () => {
  state.events = [];
  saveLocal();
  renderEvents();
  setStatus("Logs cleared.");
});

btn.analyze.addEventListener("click", async () => {
  if (!state.user) {
    setStatus("Create account first.");
    return;
  }
  if (!state.events.length) {
    setStatus("Add study log entries first.");
    return;
  }

  try {
    setStatus("Running analysis on your data...");
    const data = await jsonFetch("/analyze", {
      method: "POST",
      body: JSON.stringify({
        student_id: state.user.school_id,
        daily_minutes: Number(el.dailyMinutes.value || 45),
        events: state.events,
      }),
    });
    renderAnalysis(data);
    await refreshMetrics();
    setStatus(data.summary || "Analysis complete.");
  } catch (err) {
    setStatus(`Analysis failed: ${err.message}`);
  }
});

btn.metrics.addEventListener("click", refreshMetrics);

(function init() {
  loadLocal();
  renderAccount();
  renderModules();
  renderEvents();
  refreshMetrics();
})();
