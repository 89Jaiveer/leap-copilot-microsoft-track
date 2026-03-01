const API_BASE = "http://127.0.0.1:8000";

const statusText = document.getElementById("statusText");
const conceptStates = document.getElementById("conceptStates");
const diagnosis = document.getElementById("diagnosis");
const plan = document.getElementById("plan");
const cardTemplate = document.getElementById("cardTemplate");

const healthBtn = document.getElementById("healthBtn");
const analyzeSampleBtn = document.getElementById("analyzeSampleBtn");

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

async function checkHealth() {
  setStatus("Checking API health...");
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setStatus(`API healthy: ${data.status}`);
  } catch (err) {
    setStatus(`API health failed: ${err.message}`);
  }
}

async function runSample() {
  setStatus("Running sample analysis...");
  try {
    const res = await fetch(`${API_BASE}/analyze/sample`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderResults(data);
    setStatus(data.summary);
  } catch (err) {
    clearPanels();
    setStatus(`Sample analysis failed: ${err.message}`);
  }
}

healthBtn.addEventListener("click", checkHealth);
analyzeSampleBtn.addEventListener("click", runSample);

setStatus("Ready. Start backend API, then click Analyze Sample.");
