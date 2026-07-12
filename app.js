const SOS_STORAGE_KEY = "sos-diagnostico-0-100-v3";

function sosWebCalculate(state) {
  const fields = {};
  const answers = state && state.answers ? state.answers : {};
  const difficulties = state && Array.isArray(state.difficulties) ? state.difficulties : [];
  const profile = state && state.profile ? state.profile : {};
  const ensure = (name) => {
    if (!fields[name]) fields[name] = { value: "" };
    return fields[name];
  };
  for (const module of SOS_DATA.modules) {
    for (const question of module.questions) {
      ensure(question).value = Object.prototype.hasOwnProperty.call(answers, question) ? answers[question] : "Off";
    }
    ensure(`difficulty_${module.id}`).value = difficulties.indexOf(module.id) >= 0 ? "Yes" : "Off";
  }
  ensure("profile_branch").value = profile.branch || "Off";
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
      expected: value("result_primary_expected"),
      route: value("result_primary_route"),
    },
    secondary: {
      title: value("result_secondary_title"),
      base: value("result_secondary_base"),
      evidence: value("result_secondary_evidence"),
      branch: value("result_secondary_branch"),
      action: value("result_secondary_action"),
    },
    finalRoute: value("result_final_route"),
    nextFile: value("result_next_file"),
    nextReason: value("result_next_reason"),
    ctaMessage: value("result_cta_message"),
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
    profile: {
      branch: data.get("profile_branch") || "",
      phase: data.get("profile_phase") || "",
      salesModel: data.get("profile_sales_model") || "",
      subniche: data.get("profile_subniche") || "",
    },
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

function sosSanitiseState(raw) {
  const safe = {
    profile: { branch: "", phase: "", salesModel: "", subniche: "" },
    answers: {},
    difficulties: [],
  };
  if (!raw || typeof raw !== "object") return safe;
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  if (typeof profile.branch === "string" && Object.prototype.hasOwnProperty.call(SOS_DATA.branchLabels, profile.branch)) {
    safe.profile.branch = profile.branch;
  }
  for (const [key, limit] of [["phase", 80], ["salesModel", 80], ["subniche", 120]]) {
    if (typeof profile[key] === "string") safe.profile[key] = profile[key].trim().slice(0, limit);
  }
  const answers = raw.answers && typeof raw.answers === "object" ? raw.answers : {};
  for (let index = 1; index <= 30; index += 1) {
    const id = `q${String(index).padStart(2, "0")}`;
    if (typeof answers[id] === "string" && /^[0-4]$/.test(answers[id])) safe.answers[id] = answers[id];
  }
  const validModules = new Set(SOS_DATA.modules.map((module) => module.id));
  if (Array.isArray(raw.difficulties)) {
    for (const moduleId of raw.difficulties) {
      if (typeof moduleId === "string" && validModules.has(moduleId) && !safe.difficulties.includes(moduleId)) {
        safe.difficulties.push(moduleId);
        if (safe.difficulties.length === 2) break;
      }
    }
  }
  return safe;
}

function sosLoadState() {
  try {
    return sosSanitiseState(JSON.parse(localStorage.getItem(SOS_STORAGE_KEY) || "null"));
  } catch (_) {
    try { localStorage.removeItem(SOS_STORAGE_KEY); } catch (_) {}
    return sosSanitiseState(null);
  }
}

function sosRestoreForm(form, state) {
  if (!state) return;
  const profile = state.profile || {};
  if (profile.branch && form.elements.profile_branch) form.elements.profile_branch.value = profile.branch;
  const profileFields = {
    profile_phase: profile.phase,
    profile_sales_model: profile.salesModel,
    profile_subniche: profile.subniche,
  };
  for (const name of Object.keys(profileFields)) {
    if (form.elements[name]) form.elements[name].value = profileFields[name] || "";
  }
  const answers = state.answers || {};
  for (const name of Object.keys(answers)) {
    if (form.elements[name]) form.elements[name].value = answers[name];
  }
  const difficultyControls = form.elements.difficulty;
  if (difficultyControls) {
    const controls = typeof difficultyControls.length === "number" ? Array.from(difficultyControls) : [difficultyControls];
    for (const control of controls) control.checked = (state.difficulties || []).includes(control.value);
  }
}

function sosEncodeState(state) {
  const json = JSON.stringify(sosSanitiseState(state));
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sosDecodeState(encoded) {
  try {
    const normalised = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised + "=".repeat((4 - normalised.length % 4) % 4);
    return sosSanitiseState(JSON.parse(decodeURIComponent(escape(atob(padded)))));
  } catch (_) {
    return sosSanitiseState(null);
  }
}

function sosReportUrl(state) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?relatorio=${encodeURIComponent(sosEncodeState(state))}`;
}

function sosProgress(state) {
  return Object.keys(state.answers || {}).length;
}

function sosValidateState(state) {
  const missingQuestions = [];
  for (let index = 1; index <= 30; index += 1) {
    const id = `q${String(index).padStart(2, "0")}`;
    if (!Object.prototype.hasOwnProperty.call(state.answers || {}, id)) missingQuestions.push(id);
  }
  if (!state.profile || !state.profile.branch) {
    return { complete: false, target: "profile", message: "Escolhe primeiro o ramo principal da tua loja." };
  }
  if (missingQuestions.length) {
    return {
      complete: false,
      target: missingQuestions[0],
      message: `Faltam ${missingQuestions.length} respostas. Vamos até à primeira em falta: ${missingQuestions[0].toUpperCase()}.`,
    };
  }
  return { complete: true, target: "results", message: "As 30 respostas estão completas. O resultado está pronto." };
}

function sosScrollTo(identifier) {
  const target = identifier === "profile"
    ? document.getElementById("profile")
    : document.querySelector(`[data-question="${identifier}"]`);
  if (!target) return;
  try { target.scrollIntoView({ behavior: "smooth", block: "start" }); }
  catch (_) { target.scrollIntoView(); }
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
  const expected = element.querySelector("[data-priority-expected]");
  if (expected) expected.textContent = priority.expected || "";
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
  document.getElementById("result-final-route").textContent = result.finalRoute;
  document.getElementById("result-next-file").textContent = result.nextFile;
  document.getElementById("result-next-reason").textContent = result.nextReason;
  document.getElementById("result-cta-message").textContent = result.ctaMessage;
}

function sosShareText(result) {
  return [
    "SOS Diagnóstico 0-100",
    `Resultado: ${result.total}/100 - ${result.totalBand}`,
    `Prioridade: ${result.primary.title}`,
    `Direção: ${result.finalRoute}`,
    `Próximo ficheiro: ${result.nextFile}`,
  ].join("\n");
}

async function sosCopyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // Continua para o método compatível com navegadores internos.
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let copied = false;
  try { copied = Boolean(document.execCommand("copy")); } catch (_) {}
  area.remove();
  if (!copied) throw new Error("copy-not-supported");
  return true;
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
  const shareNote = document.getElementById("share-note");
  const manualShareText = document.getElementById("manual-share-text");
  const manualReportLink = document.getElementById("manual-report-link");
  const reportParameter = new URLSearchParams(window.location.search).get("relatorio");
  const initialState = reportParameter ? sosDecodeState(reportParameter) : sosLoadState();
  let currentResult = null;
  let currentState = initialState;

  sosRestoreForm(form, initialState);

  const showNotice = (message, isError) => {
    ready.textContent = message;
    ready.classList.toggle("error", Boolean(isError));
    ready.hidden = false;
  };

  const refresh = (showResult = false) => {
    const state = sosReadForm(form);
    currentState = state;
    const answered = sosProgress(state);
    const validation = sosValidateState(state);
    const saved = sosSaveState(state);
    progressFill.style.width = `${Math.round(answered / 30 * 100)}%`;
    progressCopy.textContent = `${answered} de 30 respostas`;
    savedNote.textContent = saved ? "As respostas ficam guardadas neste dispositivo." : "O navegador não permitiu guardar as respostas, mas o cálculo continua a funcionar.";

    if (validation.complete) {
      currentResult = sosWebCalculate(state);
      sosRenderResult(currentResult);
      results.hidden = false;
      showNotice("As 30 respostas estão completas. O resultado já foi calculado.", false);
      if (showResult) {
        try { results.scrollIntoView({ behavior: "smooth", block: "start" }); }
        catch (_) { results.scrollIntoView(); }
      }
    } else {
      currentResult = null;
      results.hidden = true;
      ready.hidden = true;
    }
    return { state, validation };
  };

  const showManualShare = (text, message) => {
    manualShareText.value = text;
    manualShareText.hidden = false;
    shareNote.textContent = message;
    try { manualShareText.focus(); manualShareText.select(); } catch (_) {}
  };

  form.addEventListener("change", (event) => {
    if (event.target.name === "difficulty") {
      const checked = form.querySelectorAll('[name="difficulty"]:checked');
      if (checked.length > 2) {
        event.target.checked = false;
        window.alert("Escolhe no máximo duas dificuldades.");
      }
    }
    refresh(false);
  });
  form.addEventListener("input", () => refresh(false));
  resultButton.addEventListener("click", () => {
    const state = sosReadForm(form);
    const validation = sosValidateState(state);
    if (!validation.complete) {
      showNotice(validation.message, true);
      sosScrollTo(validation.target);
      return;
    }
    refresh(true);
  });
  resetButton.addEventListener("click", () => {
    if (!window.confirm("Queres apagar todas as respostas deste diagnóstico?")) return;
    form.reset();
    try { localStorage.removeItem(SOS_STORAGE_KEY); } catch (_) {}
    refresh(false);
    sosScrollTo("profile");
  });
  document.getElementById("print-result").addEventListener("click", () => window.print());
  document.getElementById("open-report").addEventListener("click", () => {
    if (!currentResult) return;
    const url = sosReportUrl(currentState);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) {
      manualReportLink.href = url;
      manualReportLink.hidden = false;
      shareNote.textContent = "O navegador bloqueou a nova página. Toca na ligação abaixo para abrir o relatório.";
    }
  });
  document.getElementById("copy-result").addEventListener("click", async () => {
    if (!currentResult) return;
    const text = `${sosShareText(currentResult)}\nRelatório: ${sosReportUrl(currentState)}`;
    manualShareText.hidden = true;
    try {
      await sosCopyText(text);
      shareNote.textContent = "Resumo e ligação copiados. Já podes colá-los numa mensagem.";
    } catch (_) {
      showManualShare(text, "A cópia automática foi bloqueada. Mantém premido no texto para copiar.");
    }
  });
  document.getElementById("share-result").addEventListener("click", async () => {
    if (!currentResult) return;
    const text = sosShareText(currentResult);
    const url = sosReportUrl(currentState);
    manualShareText.hidden = true;
    try {
      if (!navigator.share) throw new Error("share-not-supported");
      await navigator.share({ title: "SOS Diagnóstico 0-100", text, url });
      shareNote.textContent = "Resultado partilhado.";
    } catch (error) {
      if (error && error.name === "AbortError") return;
      showManualShare(`${text}\nRelatório: ${url}`, "A partilha automática não abriu. Usa “Copiar resumo” ou mantém premido no texto.");
    }
  });
  window.addEventListener("beforeprint", () => {
    const state = sosReadForm(form);
    if (sosValidateState(state).complete) sosRenderResult(sosWebCalculate(state));
  });
  refresh(false);
  if (reportParameter) {
    const validation = sosValidateState(currentState);
    if (validation.complete) {
      document.body.classList.add("report-mode");
      results.hidden = false;
    } else {
      showNotice("Esta ligação de relatório está incompleta. Preenche as respostas em falta.", true);
    }
  }
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", sosInitialise);
