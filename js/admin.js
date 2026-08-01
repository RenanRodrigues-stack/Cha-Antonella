import { CONFIG } from "./config.js";
import { DB } from "./data.js";
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- Login (Firebase Authentication) ----------
// Crie o usuário admin em: Firebase Console > Authentication > Users > Add user

onAuthStateChanged(auth, (user) => {
  if (user) mostrarPainel();
});

document.getElementById("botao-entrar").addEventListener("click", tentarLogin);
document.getElementById("senha").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tentarLogin();
});

async function tentarLogin() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const erro = document.getElementById("erro-senha");
  erro.style.display = "none";

  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    erro.style.display = "block";
  }
}

document.getElementById("botao-sair").addEventListener("click", () => signOut(auth));

async function mostrarPainel() {
  document.getElementById("tela-login").style.display = "none";
  document.getElementById("painel").style.display = "block";
  preencherConfig();
  await DB.init();
  await renderizarTabelaItens();
  await renderizarTabelaConfirmacoes();
}

// ---------- Abas ----------
document.querySelectorAll(".aba-botao").forEach((botao) => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".aba-botao").forEach((b) => b.classList.remove("ativa"));
    document.querySelectorAll(".aba-conteudo").forEach((c) => c.classList.remove("ativa"));
    botao.classList.add("ativa");
    document.getElementById(`aba-${botao.dataset.aba}`).classList.add("ativa");
  });
});

// ---------- Configurações (somente leitura) ----------
function preencherConfig() {
  document.getElementById("cfg-nome").textContent = CONFIG.nomeBebe;
  document.getElementById("cfg-data").textContent = new Date(CONFIG.dataEvento).toLocaleString("pt-BR");
  document.getElementById("cfg-local").textContent = CONFIG.local;
}

// ---------- Itens ----------
document.getElementById("novo-tipo").addEventListener("change", (e) => {
  const limite = document.getElementById("novo-limite");
  if (e.target.value === "unico") {
    limite.value = 1;
    limite.disabled = true;
  } else {
    limite.disabled = false;
  }
});

document.getElementById("botao-add-item").addEventListener("click", async () => {
  const nome = document.getElementById("novo-nome").value.trim();
  const categoria = document.getElementById("novo-categoria").value.trim() || "Outros";
  const tipo = document.getElementById("novo-tipo").value;
  const limite = document.getElementById("novo-limite").value || 1;

  if (!nome) {
    alert("Digite o nome do item.");
    return;
  }

  await DB.addItem({ nome, categoria, tipo, quantidadeMaxima: limite });

  document.getElementById("novo-nome").value = "";
  document.getElementById("novo-categoria").value = "";
  document.getElementById("novo-limite").value = 1;

  await renderizarTabelaItens();
});

async function renderizarTabelaItens() {
  const corpo = document.getElementById("tabela-itens");
  corpo.innerHTML = `<tr><td colspan="6" class="vazio">Carregando...</td></tr>`;

  const itens = await DB.getTodosItens();
  corpo.innerHTML = "";

  if (itens.length === 0) {
    corpo.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum item cadastrado ainda.</td></tr>`;
    return;
  }

  itens.forEach((item) => {
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.categoria}</td>
      <td>
        <input type="number" min="1" value="${item.quantidadeMaxima}"
               style="width:70px;" data-editar-limite="${item.id}" />
      </td>
      <td>${item.quantidadeEscolhida}</td>
      <td><span class="badge ${item.ativo ? "ativo" : "inativo"}">${item.ativo ? "Ativo" : "Inativo"}</span></td>
      <td style="white-space:nowrap;">
        <button class="botao pequeno secundario" data-reabrir="${item.id}" title="Zera as reservas deste item">Reabrir vagas</button>
        <button class="botao pequeno secundario" data-toggle="${item.id}">${item.ativo ? "Desativar" : "Ativar"}</button>
        <button class="botao pequeno perigo" data-remover="${item.id}">Remover</button>
      </td>
    `;
    corpo.appendChild(linha);
  });

  corpo.querySelectorAll("[data-editar-limite]").forEach((input) => {
    input.addEventListener("change", async () => {
      const id = input.dataset.editarLimite;
      await DB.atualizarItem(id, { quantidadeMaxima: Number(input.value) });
      await renderizarTabelaItens();
    });
  });

  corpo.querySelectorAll("[data-toggle]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await DB.toggleAtivo(botao.dataset.toggle);
      await renderizarTabelaItens();
    });
  });

  corpo.querySelectorAll("[data-remover]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      if (confirm("Remover este item da lista? Essa ação não pode ser desfeita.")) {
        await DB.removerItem(botao.dataset.remover);
        await renderizarTabelaItens();
      }
    });
  });

  corpo.querySelectorAll("[data-reabrir]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      const item = itens.find((i) => i.id === botao.dataset.reabrir);
      if (confirm(`Zerar as reservas de "${item.nome}" e liberar todas as vagas novamente?`)) {
        await DB.reabrirVagas(item.id, item.quantidadeEscolhida);
        await renderizarTabelaItens();
      }
    });
  });
}

// ---------- Confirmações ----------
async function renderizarTabelaConfirmacoes() {
  const corpo = document.getElementById("tabela-confirmacoes");
  corpo.innerHTML = `<tr><td colspan="4" class="vazio">Carregando...</td></tr>`;

  const confirmacoes = await DB.getConfirmacoes();

  document.getElementById("total-confirmados").textContent =
    `${confirmacoes.length} pessoa(s) confirmada(s).`;

  corpo.innerHTML = "";

  if (confirmacoes.length === 0) {
    corpo.innerHTML = `<tr><td colspan="4" class="vazio">Ninguém confirmou presença ainda.</td></tr>`;
    return;
  }

  confirmacoes
    .slice()
    .reverse()
    .forEach((confirmacao) => {
      const itensTexto = confirmacao.itens.length
        ? confirmacao.itens.map((i) => `${i.nome} (${i.quantidade})`).join(", ")
        : "—";

      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${confirmacao.nome}</td>
        <td>${itensTexto}</td>
        <td>${confirmacao.mensagem || "—"}</td>
        <td><button class="botao pequeno perigo" data-cancelar="${confirmacao.id}">Cancelar</button></td>
      `;
      corpo.appendChild(linha);
    });

  corpo.querySelectorAll("[data-cancelar]").forEach((botao) => {
    botao.addEventListener("click", async () => {
      if (confirm("Cancelar a presença dessa pessoa? Os itens escolhidos por ela voltarão a ficar disponíveis.")) {
        await DB.removerConfirmacao(botao.dataset.cancelar);
        await renderizarTabelaConfirmacoes();
        await renderizarTabelaItens();
      }
    });
  });
}

// ---------- Zona de risco ----------
document.getElementById("botao-reset").addEventListener("click", async () => {
  if (confirm("Isso vai apagar TODOS os itens e confirmações no Firestore. Tem certeza?")) {
    await DB.resetarTudo();
    await renderizarTabelaItens();
    await renderizarTabelaConfirmacoes();
    alert("Dados resetados.");
  }
});
