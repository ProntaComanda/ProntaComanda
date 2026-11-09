import { create } from 'zustand';

let sequencia = 0;
const MAX_VISIVEIS = 4;
// Erros ficam mais tempo: a pessoa precisa ler o que fazer.
const DURACAO_MS = { success: 4000, info: 4000, warning: 6000, error: 8000 };

export const useToastStore = create((set, get) => ({
  toasts: [],

  push: ({ tone = 'info', title, message, duration }) => {
    const id = ++sequencia;
    set((s) => ({ toasts: [...s.toasts.slice(-(MAX_VISIVEIS - 1)), { id, tone, title, message }] }));
    const ms = duration ?? DURACAO_MS[tone];
    if (ms > 0) setTimeout(() => get().dismiss(id), ms);
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Mensagens do sistema. Pode ser chamado de qualquer lugar (componentes, stores, interceptors):
 *   toast.success('Funcionário salvo');
 *   toast.error('Não foi possível salvar', 'Confira sua conexão e tente de novo.');
 * Regra de texto: o título nomeia a ação como o botão que a disparou ("Remover" -> "Removido").
 * Erros dizem o que houve e o que fazer; não pedem desculpa.
 */
export const toast = {
  success: (title, message) => useToastStore.getState().push({ tone: 'success', title, message }),
  error: (title, message) => useToastStore.getState().push({ tone: 'error', title, message }),
  warning: (title, message) => useToastStore.getState().push({ tone: 'warning', title, message }),
  info: (title, message) => useToastStore.getState().push({ tone: 'info', title, message }),
};
