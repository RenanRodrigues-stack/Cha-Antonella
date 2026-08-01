import { CONFIG } from "./config.js";

// Preenche a página inicial com os dados de CONFIG (config.js)

document.getElementById("titulo-bebe").textContent = `Chá de Bebê da ${CONFIG.nomeBebe}`;
document.getElementById("mensagem-boas-vindas").textContent = CONFIG.mensagemBoasVindas;
document.getElementById("rodape-nome").textContent = CONFIG.nomeBebe;
document.getElementById("modal-nome-bebe").textContent = CONFIG.nomeBebe;
document.title = `Chá de Bebê da ${CONFIG.nomeBebe}`;

const dataEvento = new Date(CONFIG.dataEvento);

document.getElementById("info-data").textContent = dataEvento.toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});
document.getElementById("info-hora").textContent = dataEvento.toLocaleTimeString("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
document.getElementById("info-local").textContent = CONFIG.local;

if (CONFIG.linkMapa) {
  document.getElementById("acao-mapa").style.display = "block";
  document.getElementById("link-mapa").href = CONFIG.linkMapa;
}

// ---------- Contagem regressiva ----------
function atualizarContagem() {
  const agora = new Date();
  const diferenca = dataEvento - agora;
  const elemento = document.getElementById("contagem");

  if (diferenca <= 0) {
    elemento.innerHTML = `<p style="text-align:center; font-weight:600;">O grande dia chegou! 🎉</p>`;
    return;
  }

  const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diferenca / (1000 * 60 * 60)) % 24);
  const minutos = Math.floor((diferenca / (1000 * 60)) % 60);
  const segundos = Math.floor((diferenca / 1000) % 60);

  elemento.innerHTML = `
    <div class="bloco"><span class="numero">${dias}</span><span class="rotulo">dias</span></div>
    <div class="bloco"><span class="numero">${horas}</span><span class="rotulo">horas</span></div>
    <div class="bloco"><span class="numero">${minutos}</span><span class="rotulo">min</span></div>
    <div class="bloco"><span class="numero">${segundos}</span><span class="rotulo">seg</span></div>
  `;
}

atualizarContagem();
setInterval(atualizarContagem, 1000);

// ---------- Pop-up de aviso antes de ir para a página de confirmação ----------
const linkConfirmar = document.getElementById("link-confirmar");
const modalAviso = document.getElementById("modal-aviso");
const botaoEntendido = document.getElementById("botao-entendido");

linkConfirmar.addEventListener("click", (event) => {
  event.preventDefault();
  modalAviso.classList.add("aberto");
});

botaoEntendido.addEventListener("click", () => {
  window.location.href = linkConfirmar.getAttribute("href");
});
