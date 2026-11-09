import { create } from 'zustand';

const CHAVE = 'pc-tema'; // mesma chave do script em index.html

function temaInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'dark' || salvo === 'light') return salvo;
  } catch {
    // localStorage indisponível (modo privado, etc.): segue a preferência do sistema
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicar(tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark');
}

// Tema claro/escuro do design. A classe "dark" no <html> ativa o dark: do Tailwind
// e as variáveis de cor de index.css.
export const useThemeStore = create((set, get) => ({
  tema: temaInicial(),

  definir: (tema) => {
    aplicar(tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      // sem persistência: vale só nesta sessão
    }
    set({ tema });
  },

  alternar: () => get().definir(get().tema === 'dark' ? 'light' : 'dark'),
}));

aplicar(useThemeStore.getState().tema);
