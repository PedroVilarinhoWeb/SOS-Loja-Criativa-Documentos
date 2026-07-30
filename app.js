const branchContent = {
  personalizados: {
    kicker: "Personalizados e presentes à medida",
    title: "Quando a escolha de nomes, datas, cores ou fotografias faz parte da compra.",
    text: "Os exemplos ajudam a separar quem compra de quem recebe, a recolher pedidos reais e a perceber em que ocasião a personalização passa de “bonita” a necessária.",
    example: "uma caneca procurada para oferecer a uma professora, com data limite, mensagem escolhida e receio de não chegar a tempo.",
    image: "assets/editorial/personalizados.webp",
    alt: "Criadora a preparar o desenho de uma peça personalizada no seu espaço de trabalho",
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
    alt: "Prateleiras de oficina organizadas com materiais para criação",
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
