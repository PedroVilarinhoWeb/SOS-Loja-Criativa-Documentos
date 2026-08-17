const planModules = [
  {
    title: "SOS-01 Cliente e Momento de Compra",
    problem: "A loja não distingue quem faz a encomenda de quem vai receber ou utilizar o produto.",
    work: "Usas perguntas, encomendas e situações reais para separar compradora, destinatária e motivo de compra.",
    result: "Uma leitura concreta de quem compra e das situações que fazem a procura começar.",
  },
  {
    title: "SOS-02 Posicionamento que se Percebe",
    problem: "Quem chega à página vê produtos, mas não reconhece para que compra a loja é indicada nem que diferença consegue provar.",
    work: "Registas a leitura atual, escolhes a compra, ligas a diferença a provas e testas a nova apresentação com outra pessoa.",
    result: "Uma frase principal, uma descrição curta, uma bio e provas distribuídas pela página.",
  },
  {
    title: "SOS-03 Oferta Principal",
    problem: "A loja mostra vários produtos com o mesmo peso e a cliente não sabe por onde começar.",
    work: "Comparas procura, margem, capacidade, prova e função de cada produto para escolher a oferta principal.",
    result: "Uma oferta de entrada e critérios para decidir o que deve receber prioridade.",
  },
  {
    title: "SOS-04 Preço e Valor Percebido",
    problem: "A loja cobra sem conseguir confirmar quanto custam os materiais, o tempo, as perdas e os custos da venda.",
    work: "Reúnes os valores de uma venda real, calculas custo e remuneração e escreves as regras para quantidades, alterações e extras.",
    result: "Uma conta que podes rever e uma apresentação do preço com condições e limites.",
  },
  {
    title: "SOS-05 Conteúdo e Hooks",
    problem: "As publicações mostram o produto, mas não dão à compradora uma razão concreta para parar e reconhecer a situação.",
    work: "Ligas situação, abertura, demonstração e ação seguinte a uma oferta que a loja consegue mostrar.",
    result: "Peças de conteúdo prontas a testar e critérios para manter, corrigir ou retirar cada uma.",
  },
  {
    title: "SOS-06 Alcance e Divulgação",
    problem: "A loja recebe atenção, mas não consegue dizer de onde vieram os contactos nem o que aconteceu depois.",
    work: "Escolhes uma fonte de descoberta, manténs a mesma oferta durante quatro semanas e registas cada contacto adequado.",
    result: "Um teste documentado e uma decisão sobre continuar, alterar, repetir ou abandonar a fonte.",
  },
  {
    title: "SOS-07 Prova e Confiança",
    problem: "A cliente precisa de confiar, mas encontra elogios vagos ou pouca prova do produto e do processo.",
    work: "Ligas cada dúvida a uma prova com oferta, contexto, autorização, limite e data de revisão.",
    result: "Uma biblioteca de provas que sabes onde usar e aquilo que cada peça pode afirmar.",
  },
  {
    title: "SOS-08 Caminho de Compra",
    problem: "A pessoa interessa-se, mas não percebe como escolher, encomendar, pagar ou receber.",
    work: "Reconstróis uma encomenda, decides que dados entram em cada etapa e defines quem confirma cada versão.",
    result: "Um percurso e uma confirmação que outra pessoa consegue seguir sem abrir a conversa original.",
  },
  {
    title: "SOS-09 Fecho e Acompanhamento",
    problem: "Existem conversas que param depois do preço, de uma dúvida ou da resposta “vou pensar”.",
    work: "Preparas respostas, momentos de retoma e acompanhamento sem pressionar a cliente.",
    result: "Respostas por estado, retomas com motivo, regras de paragem e um pós-venda marcado no momento certo.",
  },
  {
    title: "SOS-10 Ritmo e Campanhas",
    problem: "Produtos, datas e conteúdos entram em campanha sem respeitar o tempo e a capacidade de produção.",
    work: "Partes da data da cliente, descontas preparação, stock e trabalho confirmado e só depois marcas a abertura.",
    result: "Um calendário de 90 dias com capacidade, preparação, abertura, cortes, entrega e revisão.",
  },
];

const pageMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const forcePageMotion = new URLSearchParams(window.location.search).has("force-motion");
const scrollBehavior = () =>
  pageMotionPreference.matches && !forcePageMotion ? "auto" : "smooth";

const backToTopButton = document.querySelector(".back-to-top");
backToTopButton?.addEventListener("click", () => {
  window.dispatchEvent(new Event("sos:replay-logo"));
});

function initConvergencePreview() {
  document.documentElement.classList.add("has-convergence-preview");
  const script = document.createElement("script");
  script.src = "convergence.bundle.js?v=20260805-no-motion-control-1";
  script.async = true;
  script.addEventListener("load", () => {
    if (window.SOSConvergence?.mountConvergencePreview) {
      window.SOSConvergence.mountConvergencePreview();
      return;
    }
    document.documentElement.classList.add("convergence-preview-failed");
  });
  script.addEventListener("error", () => {
    document.documentElement.classList.add("convergence-preview-failed");
    console.warn("[Convergência SOS] Não foi possível carregar o efeito.");
  });
  document.head.append(script);
}

initConvergencePreview();


function initPlanShowcase() {
  const showcase = document.querySelector("[data-plan-showcase]");
  if (!(showcase instanceof HTMLElement)) return;

  const covers = Array.from(showcase.querySelectorAll("[data-plan-index]"));
  const code = showcase.querySelector("#plan-detail-code");
  const title = showcase.querySelector("#plan-detail-title");
  const problem = showcase.querySelector("#plan-detail-problem");
  const work = showcase.querySelector("#plan-detail-work");
  const result = showcase.querySelector("#plan-detail-result");
  if (!covers.length || !code || !title || !problem || !work || !result) return;

  const renderPlan = (index, keepCoverVisible = false) => {
    const plan = planModules[index];
    const selectedCover = covers[index];
    if (!plan || !(selectedCover instanceof HTMLElement)) return;

    const match = plan.title.match(/^(SOS-\d+)\s+(.+)$/);
    code.textContent = match?.[1] || `SOS-${String(index + 1).padStart(2, "0")}`;
    title.textContent = match?.[2] || plan.title;
    problem.textContent = plan.problem;
    work.textContent = plan.work;
    result.textContent = plan.result;

    covers.forEach((cover, coverIndex) => {
      const selected = coverIndex === index;
      cover.classList.toggle("is-active", selected);
      cover.setAttribute("aria-pressed", String(selected));
    });

    if (keepCoverVisible) {
      selectedCover.scrollIntoView({
        behavior: scrollBehavior(),
        block: "nearest",
        inline: "center",
      });
    }
  };

  covers.forEach((cover, index) => {
    cover.addEventListener("click", () => renderPlan(index));
    cover.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % covers.length;
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + covers.length) % covers.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = covers.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      covers[nextIndex].focus();
      renderPlan(nextIndex, true);
    });
  });

  renderPlan(0);
}

initPlanShowcase();

function initPreviewReader() {
  const reader = document.querySelector("[data-preview-reader]");
  const readerImage = reader?.querySelector("[data-preview-reader-image]");
  const readerTitle = reader?.querySelector("[data-preview-reader-title]");
  const readerViewport = reader?.querySelector(".preview-reader-viewport");
  const originalLink = reader?.querySelector("[data-preview-original]");
  const closeButton = reader?.querySelector("[data-preview-close]");
  const triggers = document.querySelectorAll("[data-preview-open]");

  if (
    typeof HTMLDialogElement === "undefined" ||
    !(reader instanceof HTMLDialogElement) ||
    !(readerImage instanceof HTMLImageElement)
  ) return;

  let opener = null;

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (typeof reader.showModal !== "function") return;

      const source = trigger.getAttribute("href");
      const preview = trigger.querySelector("img");
      if (!source || !(preview instanceof HTMLImageElement)) return;
      if (reader.open) return;

      event.preventDefault();
      opener = trigger;
      readerImage.src = source;
      readerImage.alt = preview.alt;
      if (readerTitle) readerTitle.textContent = trigger.dataset.previewTitle || "Página de exemplo";
      if (originalLink instanceof HTMLAnchorElement) originalLink.href = source;
      document.body.classList.add("preview-reader-open");
      reader.showModal();
      requestAnimationFrame(() => {
        if (readerViewport instanceof HTMLElement) {
          readerViewport.scrollTop = 0;
          readerViewport.scrollLeft = 0;
        }
      });
    });
  });

  closeButton?.addEventListener("click", () => reader.close());
  reader.addEventListener("click", (event) => {
    if (event.target === reader) reader.close();
  });
  reader.addEventListener("close", () => {
    document.body.classList.remove("preview-reader-open");
    readerImage.removeAttribute("src");
    if (opener instanceof HTMLElement) opener.focus();
    opener = null;
  });
}

initPreviewReader();

const branchContent = {
  personalizados: {
    kicker: "Personalizados e presentes à medida",
    title: "Quando a escolha de nomes, datas, cores ou fotografias faz parte da compra.",
    text: "Os exemplos ajudam a separar quem compra de quem recebe, a recolher pedidos reais e a perceber em que ocasião a personalização passa de “bonita” a necessária.",
    example: "uma caneca procurada para oferecer a uma professora, com data limite, mensagem escolhida e receio de não chegar a tempo.",
    image: "assets/editorial/personalizados.webp",
    alt: "Saco de pano e caneca personalizados com o logótipo SOS Loja Criativa numa bancada de trabalho",
  },
  artesanato: {
    kicker: "Artesanato e peças feitas à mão",
    title: "Quando o material, o tempo de produção e a variação manual fazem parte do valor.",
    text: "Os exemplos trabalham escolhas que uma peça feita à mão exige: utilização, dimensão, acabamento, prazo e diferenças naturais entre peças.",
    example: "uma taça procurada para uma casa nova, com pouco espaço, necessidade de entrega antes da primeira visita e dúvida entre duas medidas.",
    image: "assets/editorial/artesanato.webp",
    alt: "Mãos de artesã a pintar uma peça de cerâmica",
  },
  moda: {
    kicker: "Roupa, moda e acessórios",
    title: "Quando tamanho, corte, stock e combinação pesam na decisão.",
    text: "Os exemplos não tratam uma peça de roupa como um objeto genérico. Trabalham prova de tamanho, ocasião, segurança na escolha e aquilo que acontece quando uma opção não serve.",
    example: "uma bolsa escolhida para uso diário, com dúvida sobre capacidade, fecho, cor disponível e combinação com o que a cliente já usa.",
    image: "assets/editorial/moda.webp",
    alt: "Mãos a coser uma peça de tecido numa máquina de costura",
  },
  papelaria: {
    kicker: "Papelaria criativa, ilustração e produtos digitais",
    title: "Quando formato, organização, impressão e modo de utilização precisam de estar claros.",
    text: "Os exemplos distinguem produto físico de ficheiro, mostram como explicar formato e ajudam a reduzir dúvidas sobre impressão, edição, medidas e entrega.",
    example: "um planner procurado para organizar encomendas, com dúvida entre versão impressa e digital, número de páginas e possibilidade de personalização.",
    image: "assets/editorial/papelaria.webp",
    alt: "Trabalho manual de precisão numa peça de papelaria",
  },
  eventos: {
    kicker: "Festas, eventos e lembranças",
    title: "Quando data, quantidade, aprovação e entrega não podem ficar implícitas.",
    text: "Os exemplos seguem o percurso real de uma encomenda ligada a uma data: tema, número de convidados, alterações, aprovação e margem de segurança.",
    example: "lembranças para um batizado, com quantidade ainda por confirmar, nome da criança, data fixa e necessidade de aprovar o modelo antes da produção.",
    image: "assets/editorial/eventos.webp",
    alt: "Conjunto de convites de casamento preparado sobre uma mesa",
  },
  pastelaria: {
    kicker: "Pastelaria criativa e presentes comestíveis",
    title: "Quando sabor, alergénios, conservação e hora de entrega condicionam a venda.",
    text: "Os exemplos incluem informação que não pode ser adiada para o fim da conversa: número de pessoas, data, transporte, conservação e restrições alimentares.",
    example: "um bolo para uma festa infantil, com tema definido, vinte convidados, recolha de manhã e uma criança com alergia a frutos secos.",
    image: "assets/editorial/pastelaria.webp",
    alt: "Mãos de pasteleira a terminar a decoração de um bolo",
  },
  materiais: {
    kicker: "Materiais, kits e artigos para outras criadoras",
    title: "Quando compatibilidade, quantidade, aplicação e reposição decidem a compra.",
    text: "Os exemplos tratam a compradora como alguém que vai produzir: precisa de saber se o material serve, quanto rende, como se aplica e quando volta a existir.",
    example: "um kit têxtil para uma primeira encomenda, com dúvida sobre metragem, combinação de materiais, rendimento e reposição da mesma cor.",
    image: "assets/editorial/materiais.webp",
    alt: "Tecidos, fitas, papéis, vinil e pequenos materiais organizados numa bancada de trabalho",
  },
};

const branchTabs = document.querySelectorAll("[data-branch]");
const branchPanel = document.querySelector("#branch-panel");
const branchImage = document.querySelector("#branch-image");
const branchKicker = document.querySelector("#branch-kicker");
const branchTitle = document.querySelector("#branch-title");
const branchText = document.querySelector("#branch-text");
const branchExample = document.querySelector("#branch-example");

Object.values(branchContent).forEach(({ image }) => {
  const preloader = new Image();
  preloader.src = image;
});

let branchSelection = 0;

async function selectBranch(branchId) {
  const content = branchContent[branchId];
  if (!content) return;
  const selection = ++branchSelection;

  branchTabs.forEach((tab) => {
    const selected = tab.dataset.branch === branchId;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && branchPanel instanceof HTMLElement) {
      branchPanel.setAttribute("aria-labelledby", tab.id);
    }
  });

  branchImage.classList.add("is-changing");
  branchKicker.textContent = content.kicker;
  branchTitle.textContent = content.title;
  branchText.textContent = content.text;
  branchExample.textContent = content.example;

  const nextImage = new Image();
  nextImage.src = content.image;
  try {
    await nextImage.decode();
  } catch {
    // The current image remains visible if the replacement cannot be decoded.
  }

  if (selection !== branchSelection) return;
  if (!nextImage.complete || nextImage.naturalWidth === 0) {
    branchImage.classList.remove("is-changing");
    return;
  }
  branchImage.src = content.image;
  branchImage.alt = content.alt;
  requestAnimationFrame(() => branchImage.classList.remove("is-changing"));
}

branchTabs.forEach((tab) => {
  tab.addEventListener("click", () => void selectBranch(tab.dataset.branch));
  tab.addEventListener("keydown", (event) => {
    const tabs = Array.from(branchTabs);
    const index = tabs.indexOf(tab);
    let nextIndex = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % tabs.length;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    tabs[nextIndex].focus();
    void selectBranch(tabs[nextIndex].dataset.branch);
  });
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    if (link.hasAttribute("data-focus-target")) {
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }
  });
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

const header = document.querySelector("[data-header]");
const mobileCta = document.querySelector(".mobile-cta");
const hero = document.querySelector(".hero");

if (header || mobileCta) {
  const updatePageControls = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
    if (mobileCta && hero) {
      const revealPoint = Math.max(420, hero.offsetHeight * 0.72);
      mobileCta.classList.toggle("is-visible", window.scrollY > revealPoint);
    }
  };
  updatePageControls();
  window.addEventListener("scroll", updatePageControls, { passive: true });
}
