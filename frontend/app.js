const state = {
  apiBase: "http://127.0.0.1:8000",
  user: null,
  modules: [], // {name, deadline}
  events: [],
  latestRecommendationId: null,
};

const el = {
  apiBase: document.getElementById("apiBase"),
  statusText: document.getElementById("statusText"),
  schoolId: document.getElementById("schoolId"),
  studentName: document.getElementById("studentName"),
  accountInfo: document.getElementById("accountInfo"),
  moduleInput: document.getElementById("moduleInput"),
  moduleDeadline: document.getElementById("moduleDeadline"),
  moduleList: document.getElementById("moduleList"),
  eventConcept: document.getElementById("eventConcept"),
  eventMarksObtained: document.getElementById("eventMarksObtained"),
  eventMarksTotal: document.getElementById("eventMarksTotal"),
  eventRt: document.getElementById("eventRt"),
  eventDifficulty: document.getElementById("eventDifficulty"),
  eventAttempt: document.getElementById("eventAttempt"),
  eventTableWrap: document.getElementById("eventTableWrap"),
  dailyMinutes: document.getElementById("dailyMinutes"),
  conceptStates: document.getElementById("conceptStates"),
  diagnosis: document.getElementById("diagnosis"),
  plan: document.getElementById("plan"),
  insights: document.getElementById("insights"),
  metrics: document.getElementById("metrics"),
  weakTopicInput: document.getElementById("weakTopicInput"),
  youtubeLinks: document.getElementById("youtubeLinks"),
  trendChart: document.getElementById("trendChart"),
  moduleChart: document.getElementById("moduleChart"),
};

const btn = {
  health: document.getElementById("healthBtn"),
  register: document.getElementById("registerBtn"),
  addModule: document.getElementById("addModuleBtn"),
  addEvent: document.getElementById("addEventBtn"),
  clearEvents: document.getElementById("clearEventsBtn"),
  analyze: document.getElementById("analyzeBtn"),
  metrics: document.getElementById("metricsBtn"),
  youtube: document.getElementById("youtubeBtn"),
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

function toSlug(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
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
    // ignore corrupted local storage
  }
}

function findModule(name) {
  return state.modules.find((m) => m.name === name);
}

function scorePct(event) {
  return Math.round((event.marks_obtained / event.marks_total) * 100);
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
    state.modules.forEach((m, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${m.name}${m.deadline ? ` (test: ${m.deadline})` : ""} <button class="btn ghost" data-rem-module="${i}">x</button>`;
      el.moduleList.appendChild(chip);
    });
  }

  el.eventConcept.innerHTML = "";
  state.modules.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.name;
    option.textContent = m.name;
    el.eventConcept.appendChild(option);
  });

  el.moduleList.querySelectorAll("button[data-rem-module]").forEach((button) => {
    button.addEventListener("click", () => {
      state.modules.splice(Number(button.dataset.remModule), 1);
      saveLocal();
      renderModules();
    });
  });
}

function renderEvents() {
  if (!state.events.length) {
    el.eventTableWrap.innerHTML = '<p class="muted">No study logs yet.</p>';
    drawCharts();
    return;
  }

  const rows = state.events
    .map(
      (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.concept_id}</td>
        <td>${e.marks_obtained}/${e.marks_total} (${scorePct(e)}%)</td>
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
        <tr><th>#</th><th>Module</th><th>Marks</th><th>RT(s)</th><th>Difficulty</th><th>Attempt</th><th>Action</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  el.eventTableWrap.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.events.splice(Number(button.dataset.remove), 1);
      saveLocal();
      renderEvents();
    });
  });

  drawCharts();
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
  state.latestRecommendationId = data.recommendation_id;

  renderList(el.conceptStates, data.concept_states || [], (c) => {
    const badgeClass = c.trend === "improving" ? "badge-good" : c.trend === "regressing" ? "badge-bad" : "badge-warn";
    return `<strong>${c.concept_id}</strong><div class="muted">Mastery ${Math.round(c.mastery_score * 100)}% | <span class="${badgeClass}">${c.trend}</span></div><div class="muted">${c.evidence.join(" | ")}</div>`;
  });

  renderList(el.diagnosis, data.diagnosis || [], (d) => {
    return `<strong>${d.concept_id}</strong><div class="muted">Cause: ${d.cause} | Score: ${Math.round(d.score * 100)}%</div><div class="muted">${(d.evidence || []).slice(0, 3).join(" | ")}</div>`;
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
          body: JSON.stringify({ recommendation_id: recommendationId, action, note }),
        });
        setStatus(`Feedback submitted: ${action}.`);
        await refreshMetrics();
      } catch (err) {
        setStatus(`Feedback failed: ${err.message}`);
      }
    });
  });

  renderInsights(data);
}

function daysTo(dateText) {
  if (!dateText) return null;
  const now = new Date();
  const target = new Date(dateText);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function moduleAverage(moduleName) {
  const records = state.events.filter((e) => e.concept_id === moduleName);
  if (!records.length) return null;
  return records.reduce((acc, e) => acc + scorePct(e), 0) / records.length;
}

function renderInsights(data) {
  const insights = [];

  if (data.diagnosis?.length) {
    const top = data.diagnosis[0];
    insights.push(`Top weakness: ${top.concept_id} (${top.cause.replaceAll("_", " ")}).`);
  }

  const modulePlans = state.modules
    .map((m) => {
      const avg = moduleAverage(m.name);
      const d = daysTo(m.deadline);
      if (avg == null || d == null || d <= 0) return null;
      const gap = Math.max(0, 80 - avg);
      const minutes = Math.max(20, Math.round((gap / 80) * 90 + (14 / Math.max(d, 1)) * 20));
      return { module: m.name, avg: Math.round(avg), days: d, suggested: Math.min(minutes, 120) };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

  modulePlans.forEach((p) => {
    insights.push(
      `${p.module}: ${p.avg}% average, ${p.days} day(s) to test. Suggested daily focus: ${p.suggested} minutes.`
    );
  });

  renderList(el.insights, insights, (line) => `<span>${line}</span>`);
}

async function renderYoutubeLinks(topic) {
  if (!topic.trim()) {
    el.youtubeLinks.innerHTML = '<p class="muted">Enter a weak topic first.</p>';
    return;
  }

  const query = topic.trim();
  setStatus(`Searching YouTube for: ${query}...`);
  try {
    const data = await jsonFetch(`/youtube/search?q=${encodeURIComponent(query)}&limit=6`);
    if (!data.results?.length) {
      el.youtubeLinks.innerHTML = '<p class="muted">No YouTube matches found for this topic.</p>';
      setStatus("No YouTube results found.");
      return;
    }

    el.youtubeLinks.innerHTML = data.results
      .map(
        (v) => `
        <div class="item youtube-item">
          <img src="${v.thumbnail}" alt="${v.title}" class="yt-thumb" />
          <div>
            <strong>${v.title}</strong>
            <div class="muted">${v.channel}${v.duration ? ` • ${v.duration}` : ""}</div>
            <a href="${v.url}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
          </div>
        </div>
      `
      )
      .join("");
    setStatus(`Found ${data.results.length} YouTube videos for "${query}".`);
  } catch (err) {
    el.youtubeLinks.innerHTML = `<p class="muted">YouTube search failed: ${err.message}</p>`;
    setStatus(`YouTube search failed: ${err.message}`);
  }
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawLineChart(canvas, values) {
  const ctx = clearCanvas(canvas);
  ctx.strokeStyle = "#4ce1ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pad = 24;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const max = 100;

  values.forEach((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * w;
    const y = pad + ((max - v) / max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#9aa8d6";
  ctx.font = "12px Inter";
  ctx.fillText("Score %", 8, 14);
}

function drawBarChart(canvas, labels, values) {
  const ctx = clearCanvas(canvas);
  const pad = 24;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const barW = w / Math.max(values.length, 1) - 10;

  values.forEach((v, i) => {
    const x = pad + i * (barW + 10);
    const barH = (v / 100) * h;
    const y = pad + (h - barH);
    ctx.fillStyle = "rgba(209,108,255,0.85)";
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = "#9aa8d6";
    ctx.font = "11px Inter";
    ctx.fillText(labels[i].slice(0, 10), x, pad + h + 14);
  });
}

function drawCharts() {
  const scores = state.events.map((e) => scorePct(e));
  if (!scores.length) {
    clearCanvas(el.trendChart).fillText("Add study logs to see trend", 20, 30);
    clearCanvas(el.moduleChart).fillText("Add study logs to see module graph", 20, 30);
    return;
  }

  drawLineChart(el.trendChart, scores);

  const byModule = {};
  state.events.forEach((e) => {
    byModule[e.concept_id] = byModule[e.concept_id] || [];
    byModule[e.concept_id].push(scorePct(e));
  });
  const labels = Object.keys(byModule);
  const values = labels.map((k) => Math.round(byModule[k].reduce((a, b) => a + b, 0) / byModule[k].length));
  drawBarChart(el.moduleChart, labels, values);
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
  const name = toSlug(el.moduleInput.value);
  const deadline = el.moduleDeadline.value || null;
  if (!name) {
    setStatus("Module cannot be empty.");
    return;
  }
  if (!findModule(name)) {
    state.modules.push({ name, deadline });
    saveLocal();
    renderModules();
  }
  el.moduleInput.value = "";
  el.moduleDeadline.value = "";
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

  const marksObtained = Number(el.eventMarksObtained.value);
  const marksTotal = Number(el.eventMarksTotal.value);
  if (!(marksTotal > 0) || marksObtained < 0 || marksObtained > marksTotal) {
    setStatus("Marks invalid. Ensure 0 <= scored <= total.");
    return;
  }

  const pct = marksObtained / marksTotal;
  const event = {
    student_id: state.user.school_id,
    timestamp: new Date().toISOString(),
    question_id: `q_${Date.now()}`,
    concept_id: el.eventConcept.value,
    correct: pct >= 0.5 ? 1 : 0,
    response_time_sec: Number(el.eventRt.value),
    attempt_no: Number(el.eventAttempt.value),
    difficulty: Number(el.eventDifficulty.value),
    source: "user_app",
    marks_obtained: marksObtained,
    marks_total: marksTotal,
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
  el.conceptStates.innerHTML = "";
  el.diagnosis.innerHTML = "";
  el.plan.innerHTML = "";
  el.insights.innerHTML = "";
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
        events: state.events.map((e) => ({
          student_id: e.student_id,
          timestamp: e.timestamp,
          question_id: e.question_id,
          concept_id: e.concept_id,
          correct: e.correct,
          response_time_sec: e.response_time_sec,
          attempt_no: e.attempt_no,
          difficulty: e.difficulty,
          source: e.source,
        })),
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
btn.youtube.addEventListener("click", () => void renderYoutubeLinks(el.weakTopicInput.value));

(function init() {
  loadLocal();
  renderAccount();
  renderModules();
  renderEvents();
  refreshMetrics();
  drawCharts();
})();
