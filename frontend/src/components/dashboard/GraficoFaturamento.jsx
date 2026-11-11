import Chart from 'react-apexcharts';
import { EmptyState, IconChart } from '../ui';
import { moeda } from '../../utils/dinheiro';
import { decimal } from '../../utils/numero';
import { rotuloDoMes } from '../../utils/mesesPt';
import { COR_DESTAQUE, useCoresGrafico } from './temaGrafico';

// Faturamento por mês (barras): os últimos 12 meses, com o mês atual em laranja
// e os outros em cinza, como no protótipo. Não muda com o filtro de período.
export default function GraficoFaturamento({ dados }) {
  const cores = useCoresGrafico();

  if (!dados.length) {
    return (
      <EmptyState
        icon={<IconChart className="h-8 w-8" />}
        title="Sem dados ainda"
        description="O faturamento mensal aparece aqui depois dos primeiros pagamentos."
      />
    );
  }

  const opcoes = {
    chart: {
      toolbar: { show: false },
      fontFamily: 'inherit',
      background: 'transparent',
      foreColor: cores.texto,
    },
    theme: { mode: cores.tema },
    plotOptions: { bar: { borderRadius: 3, columnWidth: '55%', distributed: true } },
    dataLabels: { enabled: false },
    legend: { show: false },
    colors: dados.map((d) => (d.mesAtual ? COR_DESTAQUE : cores.barra)),
    xaxis: {
      categories: dados.map((d) => rotuloDoMes(d.rotulo).toUpperCase()),
      labels: { style: { fontSize: '11px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        formatter: (v) => (v >= 1000 ? `${decimal(v / 1000)}k` : v),
        style: { fontSize: '11px' },
      },
    },
    grid: { borderColor: cores.grade, strokeDashArray: 4 },
    tooltip: { theme: cores.tema, y: { formatter: moeda } },
  };
  const series = [{ name: 'Faturamento', data: dados.map((d) => d.faturamento) }];

  return <Chart key={cores.tema} options={opcoes} series={series} type="bar" height={280} />;
}
