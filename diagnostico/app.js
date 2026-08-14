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
  const complete = totalValue !== "" && totalValue !== "-";
  return {
    complete,
    status: value("result_status"),
    total: complete ? Number.parseInt(totalValue, 10) : null,
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
    offerMode: value("result_offer_mode"),
    offerSecondary: value("result_offer_secondary"),
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

function sosSanitiseReport(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1) return null;
  const validBranches = SOS_DATA.branchLabels || {};
  const validPriorities = new Set(SOS_DATA.modules.map((module) => module.id));
  if (typeof raw.branch !== "string" || !Object.prototype.hasOwnProperty.call(validBranches, raw.branch)) return null;
  if (!Number.isInteger(raw.total) || raw.total < 0 || raw.total > 100) return null;
  if (typeof raw.priority !== "string" || !validPriorities.has(raw.priority)) return null;
  return {
    version: 1,
    branch: raw.branch,
    total: raw.total,
    priority: raw.priority,
  };
}

function sosPriorityId(result) {
  const match = String(result && result.nextFile ? result.nextFile : "").match(/SOS-(\d{2})/i);
  if (!match) return "";
  const index = Number.parseInt(match[1], 10) - 1;
  const module = SOS_DATA.modules[index];
  return module ? module.id : "";
}

function sosReportPayload(state, result) {
  return sosSanitiseReport({
    version: 1,
    branch: state && state.profile ? state.profile.branch : "",
    total: result ? result.total : null,
    priority: sosPriorityId(result),
  });
}

function sosEncodeReport(report) {
  const safe = sosSanitiseReport(report);
  if (!safe) throw new Error("invalid-report");
  const json = JSON.stringify(safe);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sosDecodeReport(encoded) {
  try {
    const normalised = String(encoded || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised + "=".repeat((4 - normalised.length % 4) % 4);
    return sosSanitiseReport(JSON.parse(decodeURIComponent(escape(atob(padded)))));
  } catch (_) {
    return null;
  }
}

function sosReportUrl(report) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?resultado=${encodeURIComponent(sosEncodeReport(report))}`;
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
  const focusTarget = target.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
  if (!focusTarget) return;
  try { focusTarget.focus({ preventScroll: true }); }
  catch (_) { focusTarget.focus(); }
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
  document.getElementById("result-offer-mode").textContent = result.offerMode;
  const offerSecondary = document.getElementById("result-offer-secondary");
  offerSecondary.textContent = result.offerSecondary;
  offerSecondary.parentElement.hidden = !result.offerSecondary;
}

function sosShareText(report) {
  const safe = sosSanitiseReport(report);
  if (!safe) return "";
  const module = SOS_DATA.modules.find((item) => item.id === safe.priority);
  return [
    "SOS Diagnóstico 0-100",
    `Ramo: ${SOS_DATA.branchLabels[safe.branch]}`,
    `Resultado: ${safe.total}/100`,
    `Prioridade: ${module ? module.label : safe.priority}`,
  ].join("\n");
}

function sosRenderSharedReport(report) {
  const safe = sosSanitiseReport(report);
  if (!safe) return false;
  const module = SOS_DATA.modules.find((item) => item.id === safe.priority);
  document.getElementById("shared-report-branch").textContent = SOS_DATA.branchLabels[safe.branch];
  document.getElementById("shared-report-score").textContent = `${safe.total}/100`;
  document.getElementById("shared-report-priority").textContent = module ? module.label : safe.priority;
  document.getElementById("shared-report").hidden = false;
  return true;
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
  const progressTrack = document.getElementById("progress-track");
  const progressCopy = document.getElementById("progress-copy");
  const ready = document.getElementById("result-ready");
  const savedNote = document.getElementById("saved-note");
  const shareNote = document.getElementById("share-note");
  const manualShareText = document.getElementById("manual-share-text");
  const manualReportLink = document.getElementById("manual-report-link");
  const difficultyFeedback = document.getElementById("difficulty-feedback");
  const parameters = new URLSearchParams(window.location.search);
  const reportParameter = parameters.get("resultado");
  const legacyReport = parameters.has("relatorio");
  const sharedReport = reportParameter ? sosDecodeReport(reportParameter) : null;
  const initialState = sosLoadState();
  let currentResult = null;
  let currentState = initialState;

  if (reportParameter) {
    document.body.classList.add("summary-mode");
    if (!sosRenderSharedReport(sharedReport)) {
      document.getElementById("shared-report-title").textContent = "Esta ligação de resultado não é válida";
      document.getElementById("shared-report-description").textContent = "O resumo está incompleto ou foi alterado. Faz um novo diagnóstico para obteres um resultado válido.";
      document.getElementById("shared-report-details").hidden = true;
      document.getElementById("shared-report").hidden = false;
    }
    return;
  }

  sosRestoreForm(form, initialState);

  const showNotice = (message, isError) => {
    ready.setAttribute("role", isError ? "alert" : "status");
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
    progressTrack.setAttribute("aria-valuenow", String(answered));
    progressTrack.setAttribute("aria-valuetext", `${answered} de 30 respostas`);
    const savedMessage = saved ? "As respostas ficam guardadas neste dispositivo." : "O navegador não permitiu guardar as respostas, mas o cálculo continua a funcionar.";
    if (savedNote.textContent !== savedMessage) savedNote.textContent = savedMessage;

    if (validation.complete) {
      currentResult = sosWebCalculate(state);
      sosRenderResult(currentResult);
      results.hidden = false;
      showNotice("As 30 respostas estão completas. O resultado já foi calculado.", false);
      if (showResult) {
        try { results.scrollIntoView({ behavior: "smooth", block: "start" }); }
        catch (_) { results.scrollIntoView(); }
        try { results.focus({ preventScroll: true }); }
        catch (_) { results.focus(); }
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
        difficultyFeedback.textContent = "Já escolheste duas dificuldades. Retira uma antes de escolher outra.";
      } else {
        difficultyFeedback.textContent = "";
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
    const report = sosReportPayload(currentState, currentResult);
    if (!report) return;
    const url = sosReportUrl(report);
    const opened = window.open(url, "_blank", "noopener");
    if (!opened) {
      manualReportLink.href = url;
      manualReportLink.hidden = false;
      shareNote.textContent = "O navegador bloqueou a nova página. Toca na ligação abaixo para abrir o resumo.";
    }
  });
  document.getElementById("copy-result").addEventListener("click", async () => {
    if (!currentResult) return;
    const report = sosReportPayload(currentState, currentResult);
    if (!report) return;
    const text = `${sosShareText(report)}\nResumo: ${sosReportUrl(report)}`;
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
    const report = sosReportPayload(currentState, currentResult);
    if (!report) return;
    const text = sosShareText(report);
    const url = sosReportUrl(report);
    manualShareText.hidden = true;
    try {
      if (!navigator.share) throw new Error("share-not-supported");
      await navigator.share({ title: "SOS Diagnóstico 0-100", text, url });
      shareNote.textContent = "Resultado partilhado.";
    } catch (error) {
      if (error && error.name === "AbortError") return;
      showManualShare(`${text}\nResumo: ${url}`, "A partilha automática não abriu. Usa “Copiar resumo” ou mantém premido no texto.");
    }
  });
  window.addEventListener("beforeprint", () => {
    const state = sosReadForm(form);
    if (sosValidateState(state).complete) sosRenderResult(sosWebCalculate(state));
  });
  refresh(false);
  if (legacyReport) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash || ""}`);
    }
    showNotice("As ligações antigas deixaram de ser aceites porque continham respostas do diagnóstico. O teu progresso continua guardado apenas neste dispositivo.", true);
  }
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", sosInitialise);
