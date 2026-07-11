const SOS_STORAGE_KEY = "sos-diagnostico-0-100-v2";

function sosWebCalculate(state) {
  const fields = {};
  const ensure = (name) => {
    if (!fields[name]) fields[name] = { value: "" };
    return fields[name];
  };
  for (const module of SOS_DATA.modules) {
    for (const question of module.questions) {
      ensure(question).value = state.answers?.[question] ?? "Off";
    }
    ensure(`difficulty_${module.id}`).value = state.difficulties?.includes(module.id) ? "Yes" : "Off";
  }
  ensure("profile_branch").value = state.profile?.branch || "Off";
  const context = { getField: ensure };
  sosRunCalculation.call(context);

  const value = (name) => ensure(name).value || "";
  const score = (name) => Number.parseInt(value(name), 10) || 0;
  const totalValue = value("result_total");
  return {
    complete: totalValue !== "",
    status: value("result_status"),
    total: totalValue === "" ? null : Number.parseInt(totalValue, 10),
    totalBand: value("result_total_band"),
    categories: SOS_DATA.categories.map((category) => ({
      id: category.id,
      label: category.label,
      score: score(`result_cat_${category.id}`),
    })),
    modules: SOS_DATA.modules.map((module) => ({
      id: module.id,
      label: module.label,
      score: score(`result_mod_${module.id}`),
    })),
    primary: {
      title: value("result_primary_title"),
      base: value("result_primary_base"),
      evidence: value("result_primary_evidence"),
      branch: value("result_primary_branch"),
      action: value("result_primary_action"),
      route: value("result_primary_route"),
    },
    secondary: {
      title: value("result_secondary_title"),
      base: value("result_secondary_base"),
      evidence: value("result_secondary_evidence"),
      branch: value("result_secondary_branch"),
      action: value("result_secondary_action"),
    },
  };
}

function sosReadForm(form) {
  const data = new FormData(form);
  const answers = {};
  for (let index = 1; index <= 30; index += 1) {
    const id = `q${String(index).padStart(2, "0")}`;
    if (data.has(id)) answers[id] = data.get(id);
  }
  return {
    profile: { branch: data.get("profile_branch") || "" },
    answers,
    difficulties: data.getAll("difficulty"),
  };
}

function sosSaveState(state) {
  try {
    localStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (_) {
    return false;
  }
}

function sosLoadState() {
  try {
    return JSON.parse(localStorage.getItem(SOS_STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function sosRestoreForm(form, state) {
  if (!state) return;
  if (state.profile?.branch) {
    const branch = form.querySelector(`[name="profile_branch"][value="${state.profile.branch}"]`);
    if (branch) branch.checked = true;
  }
  for (const [name, value] of Object.entries(state.answers || {})) {
    const answer = form.querySelector(`[name="${name}"][value="${value}"]`);
    if (answer) answer.checked = true;
  }
  for (const moduleId of state.difficulties || []) {
    const difficulty = form.querySelector(`[name="difficulty"][value="${moduleId}"]`);
    if (difficulty) difficulty.checked = true;
  }
}

function sosProgress(state) {
  return Object.keys(state.answers || {}).length;
}

function sosRenderScores(container, scores) {
  container.innerHTML = scores.map((item) => `
    <div class="score-item">
      <div class="score-item-head"><span>${item.label}</span><strong>${item.score}/100</strong></div>
      <div class="bar" aria-hidden="true"><span style="width:${item.score}%"></span></div>
    </div>
  `).join("");
}

function sosRenderPriorityElement(element, priority) {
  element.querySelector("[data-priority-title]").textContent = priority.title;
  element.querySelector("[data-priority-base]").textContent = priority.base;
  element.querySelector("[data-priority-evidence]").textContent = priority.evidence || "Não foram encontradas respostas fracas adicionais nesta área.";
  element.querySelector("[data-priority-branch]").textContent = priority.branch;
  element.querySelector("[data-priority-action]").textContent = priority.action;
  const route = element.querySelector("[data-priority-route]");
  if (route) {
    route.textContent = priority.route;
    route.hidden = !priority.route;
  }
}

function sosRenderResult(result) {
  document.getElementById("total-score").textContent = result.total;
  document.getElementById("total-band").textContent = result.totalBand;
  document.getElementById("result-status").textContent = result.status;
  sosRenderScores(document.getElementById("category-scores"), result.categories);
  sosRenderScores(document.getElementById("module-scores"), result.modules);
  sosRenderPriorityElement(document.getElementById("primary-priority"), result.primary);
  sosRenderPriorityElement(document.getElementById("secondary-priority"), result.secondary);
}

function sosInitialise() {
  const form = document.getElementById("diagnostic-form");
  const results = document.getElementById("results");
  const resultButton = document.getElementById("show-result");
  const resetButton = document.getElementById("reset-form");
  const progressFill = document.getElementById("progress-fill");
  const progressCopy = document.getElementById("progress-copy");
  const ready = document.getElementById("result-ready");
  const savedNote = document.getElementById("saved-note");

  sosRestoreForm(form, sosLoadState());

  const refresh = (showResult = false) => {
    const state = sosReadForm(form);
    const answered = sosProgress(state);
    const saved = sosSaveState(state);
    progressFill.style.width = `${Math.round(answered / 30 * 100)}%`;
    progressCopy.textContent = `${answered} de 30 respostas`;
    savedNote.textContent = saved ? "As respostas ficam guardadas neste dispositivo." : "O navegador não permitiu guardar as respostas.";
    resultButton.disabled = answered !== 30;
    ready.hidden = answered !== 30;

    if (answered === 30) {
      const result = sosWebCalculate(state);
      sosRenderResult(result);
      results.hidden = false;
      if (showResult) results.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      results.hidden = true;
    }
  };

  form.addEventListener("change", (event) => {
    if (event.target.name === "difficulty") {
      const checked = [...form.querySelectorAll('[name="difficulty"]:checked')];
      if (checked.length > 2) {
        event.target.checked = false;
        window.alert("Escolhe no máximo duas dificuldades.");
      }
    }
    refresh(false);
  });
  resultButton.addEventListener("click", () => refresh(true));
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Queres apagar todas as respostas deste diagnóstico?")) return;
    form.reset();
    try { localStorage.removeItem(SOS_STORAGE_KEY); } catch (_) {}
    refresh(false);
    document.getElementById("profile").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("print-result").addEventListener("click", () => window.print());
  window.addEventListener("beforeprint", () => {
    const state = sosReadForm(form);
    if (sosProgress(state) === 30) sosRenderResult(sosWebCalculate(state));
  });
  refresh(false);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", sosInitialise);
}
