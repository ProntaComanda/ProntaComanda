import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import CartaoIndicador from '../../components/dashboard/CartaoIndicador';
import GraficoConversao from '../../components/dashboard/GraficoConversao';
import GraficoFaturamento from '../../components/dashboard/GraficoFaturamento';
import ListaBarras from '../../components/dashboard/ListaBarras';
import PainelDashboard from '../../components/dashboard/PainelDashboard';
import SecaoEquipe from '../../components/dashboard/SecaoEquipe';
import SecaoEstatisticas from '../../components/dashboard/SecaoEstatisticas';
import SeletorDesvio from '../../components/dashboard/SeletorDesvio';
import {
  Button,
  IconBag,
  IconDollar,
  IconDownload,
  IconTarget,
  IconTicket,
  IconXSquare,
} from '../../components/ui';
import api from '../../api/axiosClient';
import { cn } from '../../lib/cn';
import { useAuthStore } from '../../store/authStore';
import { moeda } from '../../utils/dinheiro';
import { decimal, inteiro } from '../../utils/numero';

// `comparacao` é o texto que acompanha a variação: o backend compara com o período anterior
const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje', comparacao: 'vs ontem até esta hora' },
  { valor: 'semana', rotulo: 'Esta semana', comparacao: 'vs 7 dias anteriores' },
  { valor: 'mes', rotulo: 'Este mês', comparacao: 'vs mês anterior até o mesmo dia' },
];

const ROTULO_STATUS = {
  pendente: 'Pendente',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// RF17 - Dashboard de Gestão (BI)
export default function Dashboard() {
  const [periodo, setPeriodo] = useState('mes');
  const [visaoGeral, setVisaoGeral] = useState(null);
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);
  const [statusPedidos, setStatusPedidos] = useState([]);
  const [topProdutos, setTopProdutos] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [equipe, setEquipe] = useState(null);
  // desvio padrão mostrado nas estatísticas: amostral (n-1) ou populacional (n)
  const [tipoDesvio, setTipoDesvio] = useState('amostral');
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0); // "Tentar de novo" soma 1 e refaz a busca
  // período a que os dados na tela se referem (ao trocar o filtro, os números
  // antigos ficam até a resposta chegar; o PDF só libera quando já bateram)
  const [periodoCarregado, setPeriodoCarregado] = useState(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const funcionario = useAuthStore((s) => s.funcionario);

  // O gráfico "Faturamento por Mês" é sempre os últimos 12 meses — não muda
  // com o filtro de período, então carrega uma vez só.
  useEffect(() => {
    api
      .get('/dashboard/faturamento-mensal')
      .then((r) => setFaturamentoMensal(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true; // se o filtro mudar antes da resposta, a resposta velha é descartada
    setErro('');
    Promise.all([
      api.get('/dashboard/visao-geral', { params: { periodo } }),
      api.get('/dashboard/status-pedidos', { params: { periodo } }),
      api.get('/dashboard/top-produtos', { params: { periodo } }),
      api.get('/dashboard/estatisticas', { params: { periodo } }),
      api.get('/dashboard/equipe', { params: { periodo } }),
    ])
      .then(([geral, status, produtos, estat, time]) => {
        if (!ativo) return;
        setVisaoGeral(geral.data);
        setStatusPedidos(status.data);
        setTopProdutos(produtos.data);
        setEstatisticas(estat.data);
        setEquipe(time.data);
        setPeriodoCarregado(periodo);
      })
      .catch(() => ativo && setErro('Não foi possível carregar o dashboard agora.'));
    return () => {
      ativo = false;
    };
  }, [periodo, tentativa]);

  const periodoAtual = PERIODOS.find((p) => p.valor === periodo);
  const carregandoPeriodo = periodoCarregado !== periodo;

  // Exporta em PDF exatamente o que está na tela (mesmo período e mesmos números).
  const exportarPdf = async () => {
    setGerandoPdf(true);
    setErro('');
    try {
      // o gerador (e o jsPDF) só são baixados agora, no primeiro clique
      const { gerarRelatorioPdf } = await import('../../utils/gerarRelatorioPdf');
      await gerarRelatorioPdf({
        periodo,
        periodoRotulo: periodoAtual?.rotulo ?? periodo,
        geradoPor: funcionario?.nome,
        visaoGeral,
        faturamentoMensal,
        // igual à tela: só os status que têm pedidos no período
        statusPedidos: statusPedidos
          .filter((s) => s.quantidade > 0)
          .map((s) => ({ ...s, rotulo: ROTULO_STATUS[s.status] ?? s.status })),
        topProdutos,
        estatisticas,
        equipe,
        tipoDesvio,
      });
    } catch {
      setErro('Não foi possível gerar o PDF agora. Tente novamente.');
    } finally {
      setGerandoPdf(false);
    }
  };

  // quando o mês anterior já foi consolidado só existe o total do mês inteiro
  const textoComparacao =
    periodo === 'mes' && visaoGeral?.baseComparacao === 'mes-completo'
      ? 'vs mês anterior (completo)'
      : periodoAtual.comparacao;
  // semana que atravessa a virada do mês: os registros detalhados do mês anterior já foram consolidados
  const atravessaMes =
    estatisticas?.intervalo &&
    new Date(estatisticas.intervalo.inicio).getMonth() !== new Date(estatisticas.intervalo.fim).getMonth();

  const ticket = visaoGeral?.ticketMedio;
  const maiorProduto = topProdutos[0]?.valorTotal || 1;

  return (
    <AdminLayout>
      <PageHeader titulo="Dashboard" descricao="Visão geral do seu negócio em tempo real" />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<IconDownload className="h-4 w-4" />}
          onClick={exportarPdf}
          loading={gerandoPdf}
          disabled={carregandoPeriodo}
          title="Baixa um relatório em PDF com os números do período selecionado"
        >
          Exportar PDF
        </Button>

        <div
          role="group"
          aria-label="Período"
          className="inline-flex gap-1 rounded-lg border border-l-4 border-line border-l-primary bg-surface p-1"
        >
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              aria-pressed={periodo === p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={cn(
                'h-9 rounded-md px-4 text-sm font-semibold transition',
                periodo === p.valor ? 'bg-brand-gradient text-white shadow-sm' : 'text-ink-soft hover:text-ink'
              )}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-md bg-danger-soft px-4 py-2 text-sm text-danger-ink"
        >
          <span>{erro}</span>
          <Button variant="secondary" size="sm" onClick={() => setTentativa((n) => n + 1)}>
            Tentar de novo
          </Button>
        </div>
      )}

      <div className={cn('space-y-6 transition-opacity', carregandoPeriodo && visaoGeral && 'opacity-60')} aria-busy={carregandoPeriodo}>
        {/* cinco indicadores, todos iguais; o Ticket Médio vem logo depois dos Ganhos */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <CartaoIndicador
            titulo="Ganhos totais"
            Icone={IconDollar}
            valor={moeda(visaoGeral?.ganhoTotal?.valor)}
            variacao={visaoGeral?.ganhoTotal?.variacao}
            comparacao={textoComparacao}
            carregando={!visaoGeral}
          />
          <CartaoIndicador
            titulo="Ticket médio por conta"
            Icone={IconTicket}
            valor={moeda(ticket?.valor)}
            variacao={ticket?.variacao}
            comparacao={textoComparacao}
            carregando={!visaoGeral}
          />
          <CartaoIndicador
            titulo="Total de pedidos"
            Icone={IconBag}
            valor={inteiro(visaoGeral?.totalPedidos?.valor)}
            variacao={visaoGeral?.totalPedidos?.variacao}
            comparacao={textoComparacao}
            carregando={!visaoGeral}
          />
          <CartaoIndicador
            titulo="Pedidos cancelados"
            Icone={IconXSquare}
            valor={inteiro(visaoGeral?.pedidosCancelados?.valor)}
            variacao={visaoGeral?.pedidosCancelados?.variacao}
            comparacao={textoComparacao}
            invertido
            carregando={!visaoGeral}
          />
          <CartaoIndicador
            titulo="Taxa de conversão"
            Icone={IconTarget}
            valor={`${decimal(visaoGeral?.taxaConversao?.valor)}%`}
            variacao={visaoGeral?.taxaConversao?.variacao}
            comparacao={textoComparacao}
            carregando={!visaoGeral}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
          <PainelDashboard titulo="Faturamento por mês">
            <GraficoFaturamento dados={faturamentoMensal} />
          </PainelDashboard>
          <PainelDashboard titulo="Taxa de conversão">
            <GraficoConversao
              percentual={visaoGeral?.taxaConversao?.valor ?? 0}
              semPedidos={visaoGeral != null && visaoGeral.totalPedidos?.valor === 0}
            />
          </PainelDashboard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PainelDashboard titulo="Top 5 produtos">
            <ListaBarras
              numerar
              vazio="Nenhum produto vendido neste período."
              itens={topProdutos.map((p) => ({
                chave: p.nomeProduto,
                rotulo: p.nomeProduto,
                proporcao: p.valorTotal / maiorProduto,
                extra: moeda(p.valorTotal),
              }))}
            />
          </PainelDashboard>
          <PainelDashboard titulo="Status dos pedidos">
            <ListaBarras
              vazio="Nenhum pedido neste período."
              itens={statusPedidos
                .filter((s) => s.quantidade > 0)
                .map((s) => ({
                  chave: s.status,
                  rotulo: ROTULO_STATUS[s.status] ?? s.status,
                  proporcao: s.percentual / 100,
                  extra: `${inteiro(s.quantidade)} (${decimal(s.percentual)}%)`,
                }))}
            />
          </PainelDashboard>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide">Estatísticas do período</h2>
            <p className="text-xs text-ink-soft">
              Média, mediana, moda e desvio padrão sobre os dados de {periodoAtual.rotulo.toLowerCase()}.
            </p>
          </div>
          <SeletorDesvio valor={tipoDesvio} onChange={setTipoDesvio} />
        </div>
        {atravessaMes && (
          <p className="rounded-md bg-muted px-4 py-2 text-xs text-ink-soft">
            Parte deste período é do mês anterior, cujos registros detalhados já foram consolidados e não entram nestas estatísticas.
          </p>
        )}
        <SecaoEstatisticas dados={estatisticas} tipoDesvio={tipoDesvio} />

        <div className="pt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">Desempenho da equipe</h2>
          <p className="text-xs text-ink-soft">Atividade de cada funcionário no período e o padrão da equipe.</p>
        </div>
        <SecaoEquipe dados={equipe} tipoDesvio={tipoDesvio} />
      </div>
    </AdminLayout>
  );
}
