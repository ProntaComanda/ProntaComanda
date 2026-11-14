import { create } from 'zustand';

const CHAVE = 'pc-sidebar';

function inicial() {
  try {
    return localStorage.getItem(CHAVE) !== 'fechada'; // padrão: aberta
  } catch {
    return true;
  }
}

// Sidebar do desktop (admin/caixa): aberta (com textos) ou fechada (só ícones).
// A escolha fica salva no navegador.
function definir(set, aberta) {
  try {
    localStorage.setItem(CHAVE, aberta ? 'aberta' : 'fechada');
  } catch {
    // sem persistência: vale só nesta sessão
  }
  set({ aberta });
}

export const useSidebarStore = create((set, get) => ({
  aberta: inicial(),
  alternar: () => definir(set, !get().aberta),
  // Fecha e guarda a escolha, como se o usuário tivesse recolhido o menu. Usado ao entrar no
  // KDS: o menu fecha e continua fechado nas outras telas, até o usuário abrir de novo.
  fechar: () => {
    if (get().aberta) definir(set, false);
  },
}));
