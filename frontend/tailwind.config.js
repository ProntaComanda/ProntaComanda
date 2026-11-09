/** @type {import('tailwindcss').Config} */

// Cores que mudam entre tema claro e escuro vêm de variáveis CSS (definidas em
// src/index.css, em RGB "R G B") para o Tailwind aceitar opacidade: bg-surface/50.
const token = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // design tem tema claro e escuro
  theme: {
    extend: {
      colors: {
        // Mantido por compatibilidade com as telas atuais (Login etc.)
        primary: {
          DEFAULT: '#F36115', // botão laranja sólido do protótipo (ex.: "Adicionar")
          dark: '#7C2D12',
        },
        // Gradiente de marca: item ativo da sidebar, chip ativo, "Fechar Mesa"
        brand: { start: '#FF6A00', end: '#D10200' },

        // Superfícies e texto (mudam com o tema)
        canvas: { DEFAULT: token('canvas'), warm: token('canvas-warm') }, // warm = cardápio público
        surface: token('surface'), // sidebar, header, modais
        muted: token('muted'), // cards do KDS, KPIs, chips parados, inputs
        tile: token('tile'), // placas de mesa, botão secundário
        line: token('line'), // bordas e divisores
        ink: { DEFAULT: token('ink'), soft: token('ink-soft'), faint: token('ink-faint') },
        strong: { DEFAULT: token('strong'), ink: token('strong-ink') }, // botão preto (claro) / claro (escuro)

        // Status
        ok: { DEFAULT: '#00D007', soft: token('ok-soft'), ink: token('ok-ink') },
        danger: { DEFAULT: '#F50000', soft: token('danger-soft'), ink: token('danger-ink') },
        warn: { soft: token('warn-soft'), ink: token('warn-ink') },
        info: { soft: token('info-soft'), ink: token('info-ink') },

        // Status de pedido na Cozinha (KDS)
        kds: {
          novo: '#2A86FF',
          preparo: '#FF7D20',
          pronto: '#2BB900',
          atrasado: '#FC3333',
          total: '#8544F5',
        },
      },
      fontFamily: {
        // Títulos, números de mesa, #pedido: Archivo Black. Texto: Rubik.
        display: ['"Archivo Black"', 'Archivo', 'system-ui', 'sans-serif'],
        sans: ['Rubik', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #FF6A00 0%, #D10200 100%)',
        'login-gradient': 'linear-gradient(135deg, #6F2E00 0%, #3D1304 55%, #490212 100%)',
      },
      boxShadow: {
        modal: '0 20px 50px -12px rgb(0 0 0 / 0.45)',
        toast: '0 8px 24px -8px rgb(0 0 0 / 0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'pop-in': 'pop-in 180ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
