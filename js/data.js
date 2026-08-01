/**
 * CAMADA DE DADOS (DB) — versão Firebase/Firestore
 * -----------------------------------
 * Mesma ideia de antes: cada tela (main.js, confirmar.js, admin.js) chama
 * DB.algumaCoisa() sem precisar saber como os dados são guardados.
 * Agora os dados ficam no Firestore (na nuvem), então toda função é
 * assíncrona — sempre use "await" ao chamá-las.
 *
 * Coleções no Firestore:
 *   itens          -> cada documento é um item do enxoval
 *   confirmacoes   -> cada documento é a confirmação de um convidado
 */

import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Lista inicial de itens — só é usada UMA vez, para popular o Firestore
// na primeira execução (quando a coleção "itens" ainda está vazia).
const ITENS_PADRAO = [
  { nome: "Lenço umedecido", categoria: "Higiene", tipo: "limitado", quantidadeMaxima: 20 },
  { nome: "Shampoo infantil", categoria: "Higiene", tipo: "limitado", quantidadeMaxima: 2 },
  { nome: "Sabonete líquido", categoria: "Higiene", tipo: "limitado", quantidadeMaxima: 2 },
  { nome: "Pomada para assaduras", categoria: "Higiene", tipo: "unico", quantidadeMaxima: 1 },
  { nome: "Toalha de banho", categoria: "Mimos", tipo: "unico", quantidadeMaxima: 1 },
  { nome: "Banheira", categoria: "Mimos", tipo: "unico", quantidadeMaxima: 1 },
  { nome: "Termômetro", categoria: "Mimos", tipo: "unico", quantidadeMaxima: 1 },
  { nome: "Kit manicure", categoria: "Mimos", tipo: "unico", quantidadeMaxima: 1 },
];

const colItens = collection(db, "itens");
const colConfirmacoes = collection(db, "confirmacoes");

export const DB = {
  // Roda uma vez (chamada pela própria página) para garantir que existam
  // itens cadastrados. Se a coleção já tiver dados, não faz nada.
  async init() {
    const snap = await getDocs(colItens);
    if (snap.empty) {
      for (const item of ITENS_PADRAO) {
        await addDoc(colItens, { ...item, quantidadeEscolhida: 0, ativo: true });
      }
    }
  },

  async getTodosItens() {
    const snap = await getDocs(colItens);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getItensDisponiveis() {
    const itens = await this.getTodosItens();
    return itens.filter(
      (item) => item.ativo && item.quantidadeEscolhida < item.quantidadeMaxima
    );
  },

  async addItem({ nome, categoria, tipo, quantidadeMaxima }) {
    await addDoc(colItens, {
      nome,
      categoria,
      tipo,
      quantidadeMaxima: Number(quantidadeMaxima),
      quantidadeEscolhida: 0,
      ativo: true,
    });
  },

  async atualizarItem(id, dados) {
    await updateDoc(doc(db, "itens", id), dados);
  },

  async removerItem(id) {
    await deleteDoc(doc(db, "itens", id));
  },

  async toggleAtivo(id) {
    const ref = doc(db, "itens", id);
    const snap = await getDoc(ref);
    await updateDoc(ref, { ativo: !snap.data().ativo });
  },

  // Reabre vagas de um item (ex: convidado cancelou a participação)
  async reabrirVagas(id, quantidade) {
    const ref = doc(db, "itens", id);
    await runTransaction(db, async (t) => {
      const snap = await t.get(ref);
      const atual = snap.data().quantidadeEscolhida;
      t.update(ref, { quantidadeEscolhida: Math.max(0, atual - quantidade) });
    });
  },

  async getConfirmacoes() {
    const snap = await getDocs(colConfirmacoes);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // Registra a confirmação e reserva os itens escolhidos usando uma
  // TRANSAÇÃO — isso garante que, se duas pessoas confirmarem ao mesmo
  // tempo escolhendo o último item, elas não vão "roubar" vaga uma da
  // outra: o Firestore recusa e refaz a transação automaticamente.
  async addConfirmacao({ nome, mensagem, itensEscolhidos }) {
    const refs = itensEscolhidos.map((esc) => doc(db, "itens", esc.itemId));

    await runTransaction(db, async (t) => {
      // 1) Primeiro lê o estado atual de TODOS os itens envolvidos
      const snaps = await Promise.all(refs.map((ref) => t.get(ref)));

      // 2) Só depois escreve as atualizações
      snaps.forEach((snap, i) => {
        const item = snap.data();
        const escolha = itensEscolhidos[i];
        const restante = item.quantidadeMaxima - item.quantidadeEscolhida;
        const quantidadeReal = Math.min(escolha.quantidade, Math.max(0, restante));
        t.update(refs[i], {
          quantidadeEscolhida: item.quantidadeEscolhida + quantidadeReal,
        });
      });
    });

    await addDoc(colConfirmacoes, {
      nome,
      mensagem: mensagem || "",
      itens: itensEscolhidos.map((i) => ({
        itemId: i.itemId,
        nome: i.nome,
        quantidade: i.quantidade,
      })),
      criadoEm: new Date().toISOString(),
    });
  },

  // Cancela a confirmação de um convidado e devolve as vagas dos itens
  // que ele tinha escolhido.
  async removerConfirmacao(id) {
    const ref = doc(db, "confirmacoes", id);
    const snap = await getDoc(ref);
    const confirmacao = snap.data();

    for (const item of confirmacao.itens) {
      await this.reabrirVagas(item.itemId, item.quantidade);
    }
    await deleteDoc(ref);
  },

  // Apaga TODOS os itens e confirmações e recomeça do zero com a lista
  // padrão. Usado apenas no botão "Apagar todos os dados" do painel.
  async resetarTudo() {
    const [itensSnap, confirmacoesSnap] = await Promise.all([
      getDocs(colItens),
      getDocs(colConfirmacoes),
    ]);
    for (const d of itensSnap.docs) await deleteDoc(d.ref);
    for (const d of confirmacoesSnap.docs) await deleteDoc(d.ref);
    await this.init();
  },
};
