import { useThemeStore } from '../../store/themeStore';

export const COR_DESTAQUE = '#F36115'; // laranja do sistema (mês atual, barras de progresso)

// O ApexCharts desenha em SVG fora do Tailwind, então as cores do tema claro/escuro
// precisam ser passadas na mão. Quem usa deve dar `key={cores.tema}` ao gráfico,
// para ele ser redesenhado quando o tema trocar.
export function useCoresGrafico() {
  const tema = useThemeStore((s) => s.tema);
  return tema === 'dark'
    ? { tema, texto: '#a3a3a3', grade: '#333333', barra: '#4a4a4a', cancelados: '#5e5e5e', centro: '#ededed' }
    : { tema, texto: '#6c6c6c', grade: '#e5e5e5', barra: '#8c8c8c', cancelados: '#b4b4b4', centro: '#101010' };
}
