const spiralModules = [
  { src: "assets/spiral/module-01.webp", title: "SOS-01 Cliente e Momento de Compra" },
  { src: "assets/spiral/module-02.webp", title: "SOS-02 Posicionamento que se Percebe" },
  { src: "assets/spiral/module-03.webp", title: "SOS-03 Oferta Principal" },
  { src: "assets/spiral/module-04.webp", title: "SOS-04 Preço e Valor Percebido" },
  { src: "assets/spiral/module-05.webp", title: "SOS-05 Conteúdo e Hooks" },
  { src: "assets/spiral/module-06.webp", title: "SOS-06 Alcance e Divulgação" },
  { src: "assets/spiral/module-07.webp", title: "SOS-07 Prova e Confiança" },
  { src: "assets/spiral/module-08.webp", title: "SOS-08 Caminho de Compra" },
  { src: "assets/spiral/module-09.webp", title: "SOS-09 Fecho e Acompanhamento" },
  { src: "assets/spiral/module-10.webp", title: "SOS-10 Ritmo e Campanhas" },
];

const pageParameters = new URLSearchParams(window.location.search);
const motionEnabled = !pageParameters.has("static");
document.documentElement.classList.toggle("motion-enabled", motionEnabled);

function initConvergencePreview() {
  document.documentElement.classList.add("has-convergence-preview");
  const script = document.createElement("script");
  script.src = "convergence.bundle.js";
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

function initSosSpiral() {
  const container = document.querySelector("[data-sos-spiral]");
  const canvas = document.querySelector("#sos-spiral-canvas");
  if (!(container instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const turns = 1.45;
  const speed = 0.019;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forceMotionForLocalReview = motionEnabled;
  const prefersReducedMotion = () =>
    motionPreference.matches && !forceMotionForLocalReview;
  const images = spiralModules.map(({ src }) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    return image;
  });

  let width = 0;
  let height = 0;
  let deviceScale = 1;
  let progress = 0.035;
  let previousTime = 0;
  let animationFrame = 0;
  let isVisible = true;

  const spiralPoint = (position, radiusX = 1, radiusY = radiusX) => {
    const angle = position * turns * Math.PI * 2;
    const radialPosition = Math.pow(1 - position, 0.24);
    return {
      x: radiusX * radialPosition * Math.cos(angle),
      y: -radiusY * radialPosition * Math.sin(angle),
      radialPosition,
    };
  };

  const roundedRectangle = (x, y, boxWidth, boxHeight, radius) => {
    const corner = Math.min(radius, boxWidth / 2, boxHeight / 2);
    context.beginPath();
    context.moveTo(x + corner, y);
    context.arcTo(x + boxWidth, y, x + boxWidth, y + boxHeight, corner);
    context.arcTo(
      x + boxWidth,
      y + boxHeight,
      x,
      y + boxHeight,
      corner,
    );
    context.arcTo(x, y + boxHeight, x, y, corner);
    context.arcTo(x, y, x + boxWidth, y, corner);
    context.closePath();
  };

  const smoothStep = (value) => value * value * (3 - 2 * value);

  const draw = () => {
    if (!width || !height) return;

    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = Math.min(width * 0.46, 280);
    const radiusY = height * 0.66;
    const baseCoverHeight = Math.max(58, Math.min(94, height * 0.24));
    const slotCount = spiralModules.length;
    const cards = Array.from({ length: slotCount }, (_, index) => {
      const moduleIndex = index % spiralModules.length;
      const arcPosition = (progress + index / slotCount) % 1;
      return {
        arcPosition,
        image: images[moduleIndex],
        module: spiralModules[moduleIndex],
        position: arcPosition,
      };
    });

    cards.sort((first, second) => first.position - second.position);

    cards.forEach(({ arcPosition, image, position }) => {
      const point = spiralPoint(position, radiusX, radiusY);
      const distanceRatio = point.radialPosition;
      const scale = 0.28 + distanceRatio * 0.72;
      const coverHeight = baseCoverHeight * scale;
      const aspectRatio =
        image.complete && image.naturalWidth > 0
          ? image.naturalWidth / image.naturalHeight
          : 0.71;
      const coverWidth = coverHeight * aspectRatio;
      const rotation = 0;

      const fadeIn = smoothStep(Math.min(1, arcPosition / 0.08));
      const fadeOut = smoothStep(
        Math.min(1, Math.max(0, (1 - arcPosition) / 0.12)),
      );
      const centerClearance = smoothStep(
        Math.min(1, Math.max(0, (distanceRatio - 0.07) / 0.2)),
      );
      const cardCenterX = centerX + point.x;
      const cardCenterY = centerY + point.y;
      const edgeRoom = Math.min(
        cardCenterX - coverWidth / 2,
        width - (cardCenterX + coverWidth / 2),
        cardCenterY - coverHeight / 2,
        height - (cardCenterY + coverHeight / 2),
      );
      const edgeFade = smoothStep(
        Math.min(1, Math.max(0, edgeRoom / 24)),
      );
      const opacity = fadeIn * fadeOut * centerClearance * edgeFade;

      context.save();
      context.translate(cardCenterX, cardCenterY);
      context.rotate(rotation);
      context.globalAlpha = Math.max(0, opacity);
      context.shadowColor = "rgba(11, 49, 41, 0.15)";
      context.shadowBlur = 11 * scale;
      context.shadowOffsetY = 6 * scale;
      roundedRectangle(
        -coverWidth / 2,
        -coverHeight / 2,
        coverWidth,
        coverHeight,
        4,
      );
      context.fillStyle = "#fdfcf8";
      context.fill();

      context.shadowColor = "transparent";
      roundedRectangle(
        -coverWidth / 2,
        -coverHeight / 2,
        coverWidth,
        coverHeight,
        4,
      );
      context.clip();
      if (image.complete && image.naturalWidth > 0) {
        context.drawImage(
          image,
          -coverWidth / 2,
          -coverHeight / 2,
          coverWidth,
          coverHeight,
        );
      } else {
        context.fillStyle = "#f7f3e9";
        context.fillRect(
          -coverWidth / 2,
          -coverHeight / 2,
          coverWidth,
          coverHeight,
        );
      }
      context.restore();

      context.save();
      context.translate(centerX + point.x, centerY + point.y);
      context.rotate(rotation);
      context.globalAlpha = Math.max(0, opacity);
      context.strokeStyle = "rgba(157, 110, 29, 0.54)";
      context.lineWidth = 1;
      roundedRectangle(
        -coverWidth / 2,
        -coverHeight / 2,
        coverWidth,
        coverHeight,
        4,
      );
      context.stroke();
      context.restore();
    });
  };

  const resize = () => {
    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;
    if (!nextWidth || !nextHeight) return;

    width = nextWidth;
    height = nextHeight;
    deviceScale = Math.min(1.75, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * deviceScale);
    canvas.height = Math.floor(height * deviceScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    draw();
  };

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    previousTime = 0;
  };

  const animate = (time) => {
    if (!isVisible || document.hidden || prefersReducedMotion()) {
      stop();
      draw();
      return;
    }

    const elapsed = previousTime
      ? Math.min(0.1, (time - previousTime) / 1000)
      : 0;
    previousTime = time;
    progress = (progress + elapsed * speed) % 1;

    draw();
    animationFrame = requestAnimationFrame(animate);
  };

  const start = () => {
    draw();
    if (
      !animationFrame &&
      isVisible &&
      !document.hidden &&
      !prefersReducedMotion()
    ) {
      animationFrame = requestAnimationFrame(animate);
    }
  };

  images.forEach((image) => {
    image.addEventListener("load", draw, { once: true });
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    },
    { threshold: 0.04 },
  );
  visibilityObserver.observe(container);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  const handleMotionPreference = () => {
    if (prefersReducedMotion()) stop();
    start();
  };

  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", handleMotionPreference);
  } else {
    motionPreference.addListener(handleMotionPreference);
  }

  resize();
  start();
}

initSosSpiral();

function initPlanCarousel() {
  const carousel = document.querySelector("[data-plan-carousel]");
  const badge = document.querySelector("[data-plan-carousel-badge]");
  const content = document.querySelector("[data-plan-carousel-text]");
  if (
    !(carousel instanceof HTMLElement) ||
    !(badge instanceof HTMLElement) ||
    !(content instanceof HTMLElement)
  ) {
    return;
  }

  const texts = spiralModules.map(({ title }) =>
    title.replace(/^SOS-(\d+)\s+/, "$1 · "),
  );
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const forceMotionForLocalReview = motionEnabled;
  const prefersReducedMotion = () =>
    motionPreference.matches && !forceMotionForLocalReview;
  const segmenter =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter("pt", { granularity: "grapheme" })
      : null;

  let currentIndex = 0;
  let rotationTimer = 0;
  let isAnimating = false;
  let isVisible = true;

  const splitCharacters = (text) =>
    segmenter
      ? Array.from(segmenter.segment(text), ({ segment }) => segment)
      : Array.from(text);

  const shuffledIndexes = (length) => {
    const indexes = Array.from({ length }, (_, index) => index);
    for (let index = indexes.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [indexes[index], indexes[randomIndex]] = [
        indexes[randomIndex],
        indexes[index],
      ];
    }
    return indexes;
  };

  const sizeBadge = () => {
    const horizontalPadding =
      Number.parseFloat(getComputedStyle(badge).paddingLeft) +
      Number.parseFloat(getComputedStyle(badge).paddingRight);
    badge.style.width = `${Math.ceil(content.scrollWidth + horizontalPadding)}px`;
  };

  const renderText = (text, animate = true) => {
    const fragment = document.createDocumentFragment();
    splitCharacters(text).forEach((character) => {
      const span = document.createElement("span");
      span.className = "plan-carousel-char";
      span.textContent = character === " " ? "\u00a0" : character;
      fragment.append(span);
    });
    content.replaceChildren(fragment);
    sizeBadge();

    const characters = Array.from(
      content.querySelectorAll(".plan-carousel-char"),
    );
    if (!animate || typeof Element.prototype.animate !== "function") {
      isAnimating = false;
      return Promise.resolve();
    }

    const order = shuffledIndexes(characters.length);
    const animations = characters.map((character, index) =>
      character.animate(
        [
          { transform: "translateY(110%)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        {
          duration: 420,
          delay: order[index] * 20,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      ).finished,
    );
    return Promise.allSettled(animations);
  };

  const scheduleRotation = () => {
    window.clearTimeout(rotationTimer);
    if (prefersReducedMotion() || !isVisible || document.hidden) return;
    rotationTimer = window.setTimeout(() => void rotateText(), 2200);
  };

  const rotateText = async () => {
    if (isAnimating || prefersReducedMotion() || !isVisible || document.hidden) {
      scheduleRotation();
      return;
    }

    isAnimating = true;
    const characters = Array.from(
      content.querySelectorAll(".plan-carousel-char"),
    );
    const order = shuffledIndexes(characters.length);

    if (typeof Element.prototype.animate === "function") {
      await Promise.allSettled(
        characters.map((character, index) =>
          character.animate(
            [
              { transform: "translateY(0)", opacity: 1 },
              { transform: "translateY(-110%)", opacity: 0 },
            ],
            {
              duration: 360,
              delay: order[index] * 18,
              easing: "cubic-bezier(0.55, 0, 1, 0.45)",
              fill: "both",
            },
          ).finished,
        ),
      );
    }

    currentIndex = (currentIndex + 1) % texts.length;
    await renderText(texts[currentIndex], true);
    isAnimating = false;
    scheduleRotation();
  };

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) scheduleRotation();
      else window.clearTimeout(rotationTimer);
    },
    { threshold: 0.05 },
  );

  renderText(texts[0], !prefersReducedMotion()).then(scheduleRotation);
  visibilityObserver.observe(carousel);
  window.addEventListener("resize", sizeBadge, { passive: true });
  document.addEventListener("visibilitychange", scheduleRotation);
}

initPlanCarousel();

const branchContent = {
  personalizados: {
    kicker: "Personalizados e presentes à medida",
    title: "Quando a escolha de nomes, datas, cores ou fotografias faz parte da compra.",
    text: "Os exemplos ajudam a separar quem compra de quem recebe, a recolher pedidos reais e a perceber em que ocasião a personalização passa de “bonita” a necessária.",
    example: "uma caneca procurada para oferecer a uma professora, com data limite, mensagem escolhida e receio de não chegar a tempo.",
    image: "assets/editorial/personalizados.webp",
    alt: "Sacola e caneca personalizadas com o logótipo SOS Loja Criativa numa bancada de trabalho",
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
});

document.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

const header = document.querySelector("[data-header]");
if (header) {
  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}
