import BlocoEstatistico from './BlocoEstatistico';
import ListaBarras from './ListaBarras';
import PainelDashboard from './PainelDashboard';
import { comSinal, textoModa, zScore } from '../../utils/estatistica';
import { moeda } from '../../utils/dinheiro';
import { decimal, inteiro } from '../../utils/numero';

const PERFIL = { garcom: 'Garçom', caixa: 'Caixa', administrador: 'Administrador', cozinha: 'Cozinha', bar: 'Bar' };
const minutos = (v) => `${decimal(v)} min`;

// `fixa`: sempre aparece. As demais só aparecem se alguém tiver valor (ex.: "Entregas" fica oculta até existir algum registro).
const COLUNAS = [
  { chave: 'itensLancados', rotulo: 'Itens lançados', fmt: inteiro, fixa: true, dica: 'Itens lançados em comandas (inclui os depois estornados)' },
  { chave: 'mesasAtendidas', rotulo: 'Mesas atendidas', fmt: inteiro, fixa: true, dica: 'Comandas distintas em que lançou ao menos 1 item' },
  { chave: 'valorLancado', rotulo: 'Vendas lançadas', fmt: moeda, fixa: true, dica: 'Valor dos itens lançados, sem os estornados' },
  { chave: 'valorPorMesa', rotulo: 'Valor por mesa', fmt: moeda, dica: 'Vendas lançadas / mesas atendidas' },
  { chave: 'comandasAbertas', rotulo: 'Comandas abertas', fmt: inteiro },
  { chave: 'contasFechadas', rotulo: 'Contas fechadas', fmt: inteiro, dica: 'Fechamentos feitos no caixa' },
  { chave: 'ticketMedio', rotulo: 'Ticket médio', fmt: moeda, dica: 'Valor fechado / contas fechadas' },
  { chave: 'valorRecebido', rotulo: 'Recebido no caixa', fmt: moeda },
  { chave: 'descontosAplicados', rotulo: 'Descontos', fmt: inteiro, dica: 'Contas fechadas com desconto aplicado' },
  { chave: 'estornos', rotulo: 'Estornos', fmt: inteiro, dica: 'Itens estornados por este funcionário' },
  { chave: 'itensProntos', rotulo: 'Itens prontos', fmt: inteiro, dica: 'Itens marcados como prontos na cozinha/bar' },
  { chave: 'entregas', rotulo: 'Entregas marcadas', fmt: inteiro, dica: 'Itens marcados como entregues' },
  { chave: 'pedidosClienteAceitos', rotulo: 'Pedidos QR aceitos', fmt: inteiro, dica: 'Pedidos feitos pelo cliente que este funcionário aceitou' },
  { chave: 'tempoRespostaClienteMin', rotulo: 'Resposta ao QR', fmt: minutos, dica: 'Tempo médio entre o pedido do cliente e o aceite/recusa' },
];

// Desempenho por funcionário + o padrão da equipe (média, mediana e desvio ENTRE os funcionários).
export default function SecaoEquipe({ dados, tipoDesvio }) {
  if (!dados) return <p className="py-6 text-center text-sm text-ink-faint">Carregando equipe...</p>;

  const { funcionarios, comparativo } = dados;
  const resumo = comparativo.itensLancados;
  const quemLancou = funcionarios.filter((f) => f.itensLancados > 0);
  const maior = Math.max(...quemLancou.map((f) => f.itensLancados), 1);
  const colunas = COLUNAS.filter((c) => c.fixa || funcionarios.some((f) => f[c.chave] > 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BlocoEstatistico
          titulo="Itens lançados por funcionário"
          resumo={resumo}
          tipoDesvio={tipoDesvio}
          formatar={(v) => decimal(v)}
          moda={textoModa({ resumo, formatar: (v) => decimal(v) })}
          nota="Média, mediana e desvio calculados entre os funcionários que lançaram pedidos."
        >
          <ListaBarras
            vazio="Nenhum funcionário lançou pedidos neste período."
            itens={quemLancou.map((f) => {
              const z = zScore(f.itensLancados, resumo, tipoDesvio);
              return {
                chave: f.id,
                rotulo: f.nome,
                proporcao: f.itensLancados / maior,
                extra: z == null ? inteiro(f.itensLancados) : `${inteiro(f.itensLancados)} (z ${comSinal(z)})`,
              };
            })}
          />
          <p className="text-[11px] text-ink-faint">z = quantos desvios padrão acima (+) ou abaixo (−) da média da equipe.</p>
        </BlocoEstatistico>

        <BlocoEstatistico
          titulo="Vendas lançadas por funcionário"
          resumo={comparativo.valorLancado}
          tipoDesvio={tipoDesvio}
          formatar={moeda}
          moda={textoModa({ resumo: comparativo.valorLancado, formatar: moeda })}
          nota={`${comparativo.funcionariosComPedidos} funcionário(s) com pedidos no período.`}
        />
      </div>

      <PainelDashboard titulo="Desempenho por funcionário">
        {funcionarios.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">Nenhuma atividade registrada neste período.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    <th className="py-2 pr-4">Funcionário</th>
                    {colunas.map((c) => (
                      <th key={c.chave} className="px-3 py-2 text-right" title={c.dica}>
                        {c.rotulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.map((f) => (
                    <tr key={f.id} className="border-b border-line last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-semibold">{f.nome}</p>
                        <p className="text-xs text-ink-faint">
                          {PERFIL[f.perfil] ?? f.perfil}
                          {!f.ativo && ' · desligado'}
                        </p>
                      </td>
                      {colunas.map((c) => (
                        <td key={c.chave} className="px-3 py-2.5 text-right tabular-nums">
                          {f[c.chave] == null ? '-' : c.fmt(f[c.chave])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Os números mostram a atividade registrada no sistema. Diferenças entre funcionários também refletem turno, área de atendimento e função, não só desempenho.
            </p>
          </>
        )}
      </PainelDashboard>
    </div>
  );
}
