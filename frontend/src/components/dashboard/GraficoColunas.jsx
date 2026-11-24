import Chart from 'react-apexcharts';
import { COR_DESTAQUE, useCoresGrafico } from './temaGrafico';

// Gráfico de colunas simples, usado nos histogramas e nas distribuições por hora/dia.
// `destaques` são os índices das colunas em laranja (a classe modal / o pico).
export default function GraficoColunas({
  categorias,
  valores,
  destaques = [],
  nomeSerie = 'Quantidade',
  formatarValor = (v) => v,
  tituloX,
  altura = 220,
}) {
  const cores = useCoresGrafico();

  const opcoes = {
    chart: { toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent', foreColor: cores.texto },
    theme: { mode: cores.tema },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '70%', distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    colors: categorias.map((_, i) => (destaques.includes(i) ? COR_DESTAQUE : cores.barra)),
    xaxis: {
      categories: categorias,
      title: tituloX ? { text: tituloX, style: { fontSize: '11px', fontWeight: 500 } } : undefined,
      labels: { style: { fontSize: '10px' }, rotate: 0, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => Math.round(v), style: { fontSize: '11px' } } },
    grid: { borderColor: cores.grade, strokeDashArray: 4 },
    tooltip: { theme: cores.tema, y: { formatter: formatarValor } },
  };

  return <Chart key={cores.tema} options={opcoes} series={[{ name: nomeSerie, data: valores }]} type="bar" height={altura} />;
}
