import Chart from 'react-apexcharts';
import { EmptyState, IconTarget } from '../ui';
import { decimal } from '../../utils/numero';
import { COR_CANCELADOS, useCoresGrafico } from './temaGrafico';

// Taxa de conversão (rosca): itens concluídos x cancelados, com o percentual no centro.
// `semPedidos`: sem nenhum pedido no período a rosca mostraria "100% cancelados", o que engana.
export default function GraficoConversao({ percentual, semPedidos }) {
  const cores = useCoresGrafico();

  if (semPedidos) {
    return (
      <EmptyState
        icon={<IconTarget className="h-8 w-8" />}
        title="Sem pedidos no período"
        description="A taxa de conversão aparece quando houver pedidos."
      />
    );
  }

  const cancelados = Number((100 - percentual).toFixed(1));
  const opcoes = {
    chart: { fontFamily: 'inherit', background: 'transparent', foreColor: cores.texto },
    theme: { mode: cores.tema },
    labels: [`Concluídos (${decimal(percentual)}%)`, `Cancelados (${decimal(cancelados)}%)`],
    colors: [cores.concluidos, COR_CANCELADOS],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 }, labels: { colors: cores.texto } },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: false },
            value: {
              fontSize: '28px',
              fontWeight: 600,
              color: cores.centro,
              offsetY: 4,
              formatter: () => `${decimal(percentual)}%`,
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Concluídos',
              fontSize: '12px',
              color: cores.texto,
              formatter: () => `${decimal(percentual)}%`,
            },
          },
        },
      },
    },
    tooltip: { theme: cores.tema, y: { formatter: (v) => `${decimal(v)}%` } },
  };

  return <Chart key={cores.tema} options={opcoes} series={[percentual, cancelados]} type="donut" height={280} />;
}
