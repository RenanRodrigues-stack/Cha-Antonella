import { DB } from "./data.js";

// Renderiza a lista de itens disponíveis, agrupados por categoria,
// e processa o envio do formulário de confirmação de presença.

async function renderizarItens() {
  const container = document.getElementById("lista-itens");
  container.innerHTML = `<p class="vazio">Carregando itens...</p>`;

  await DB.init(); // garante que existam itens cadastrados na primeira vez
  const itens = await DB.getItensDisponiveis();

  if (itens.length === 0) {
    container.innerHTML = `<p class="vazio">Todos os itens da lista já foram escolhidos. Obrigado a todos! 💕</p>`;
    return;
  }

  // Agrupa por categoria
  const porCategoria = {};
  itens.forEach((item) => {
    if (!porCategoria[item.categoria]) porCategoria[item.categoria] = [];
    porCategoria[item.categoria].push(item);
  });

  container.innerHTML = "";

  Object.keys(porCategoria).forEach((categoria) => {
    const bloco = document.createElement("div");
    bloco.className = "categoria";

    const titulo = document.createElement("h3");
    titulo.textContent = categoria;
    bloco.appendChild(titulo);

    porCategoria[categoria].forEach((item) => {
      const restam = item.quantidadeMaxima - item.quantidadeEscolhida;
      const linha = document.createElement("div");
      linha.className = "item-lista";

      const textoRestam = item.tipo === "unico" ? "disponível" : `restam ${restam}`;

      linha.innerHTML = `
        <div>
          <span class="nome-item">${item.nome}</span>
          <span class="restam">${textoRestam}</span>
        </div>
        <div class="selecao">
          ${
            item.tipo === "limitado"
              ? `<input type="number" min="1" max="${restam}" value="1" data-qtd-para="${item.id}" style="display:none;" />`
              : ""
          }
          <input type="checkbox" data-item-id="${item.id}" data-item-nome="${item.nome}" data-item-max="${restam}" data-item-tipo="${item.tipo}" />
        </div>
      `;
      bloco.appendChild(linha);
    });

    container.appendChild(bloco);
  });

  // Mostra o campo de quantidade quando o item "limitado" é marcado
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const id = event.target.dataset.itemId;
      const campoQtd = container.querySelector(`input[data-qtd-para="${id}"]`);
      if (campoQtd) {
        campoQtd.style.display = event.target.checked ? "inline-block" : "none";
      }
    });
  });
}

renderizarItens();

document.getElementById("form-confirmacao").addEventListener("submit", async (event) => {
  event.preventDefault();

  const botao = event.target.querySelector('button[type="submit"]');
  const nome = document.getElementById("nome").value.trim();
  const mensagem = document.getElementById("mensagem").value.trim();

  if (!nome) return;

  const checkboxesMarcados = document.querySelectorAll('#lista-itens input[type="checkbox"]:checked');

  const itensEscolhidos = [];
  checkboxesMarcados.forEach((checkbox) => {
    const itemId = checkbox.dataset.itemId;
    const itemNome = checkbox.dataset.itemNome;
    const tipo = checkbox.dataset.itemTipo;
    const max = Number(checkbox.dataset.itemMax);

    let quantidade = 1;
    if (tipo === "limitado") {
      const campoQtd = document.querySelector(`input[data-qtd-para="${itemId}"]`);
      quantidade = Math.min(Math.max(1, Number(campoQtd.value) || 1), max);
    }

    itensEscolhidos.push({ itemId, nome: itemNome, quantidade });
  });

  try {
    botao.disabled = true;
    botao.textContent = "Enviando...";

    await DB.addConfirmacao({ nome, mensagem, itensEscolhidos });

    const resumo = itensEscolhidos.map((i) => `${i.nome} (${i.quantidade})`).join(", ");
    const url = resumo ? `obrigado.html?itens=${encodeURIComponent(resumo)}` : "obrigado.html";
    window.location.href = url;
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível confirmar sua presença agora. Tente novamente em instantes.");
    botao.disabled = false;
    botao.textContent = "Confirmar presença";
  }
});
