import BlocoEstatistico from './BlocoEstatistico';
import GraficoColunas from './GraficoColunas';
import ListaBarras from './ListaBarras';
import PainelDashboard from './PainelDashboard';
import { desvioDe, textoModa } from '../../utils/estatistica';
import { moeda } from '../../utils/dinheiro';
import { decimal, inteiro } from '../../utils/numero';

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const ROTULO_PAGAMENTO = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };

const reais = (v) => moeda(v);
// acima de 3 h mostra em horas, para valores grandes ficarem legíveis
const minutos = (v) => (v >= 180 ? `${decimal(v / 60)} h` : `${decimal(v)} min`);
const unidades = (v) => decimal(v);

const faixaCurta = (f) => `${decimal(f.de)}–${decimal(f.ate)}`;
const faixaReais = (f) => `R$ ${decimal(f.de)} a ${decimal(f.ate)}`;
const faixaMinutos = (f) => `${decimal(f.de)} a ${decimal(f.ate)} min`;

function Histograma({ histograma, tituloX, nomeSerie }) {
  if (!histograma?.faixas?.length) return null;
  return (
    <GraficoColunas
      categorias={histograma.faixas.map(faixaCurta)}
      valores={histograma.faixas.map((f) => f.frequencia)}
      destaques={histograma.faixaModal != null ? [histograma.faixaModal] : []}
      tituloX={tituloX}
      nomeSerie={nomeSerie}
      altura={210}
    />
  );
}

// valores atípicos (regra de Tukey) deixados de fora do histograma, e o resumo sem eles
function AvisoAtipicos({ atipicos, formatar, tipoDesvio }) {
  if (!atipicos?.quantidade) return null;
  const r = atipicos.resumoSemAtipicos;
  const desvio = r ? desvioDe(r, tipoDesvio) : null;
  return (
    <div className="space-y-1 rounded-md border border-line bg-tile px-3 py-2 text-xs text-ink-soft">
      <p>
        <span className="font-semibold text-ink">
          {inteiro(atipicos.quantidade)} valor{atipicos.quantidade > 1 ? 'es' : ''} atípico{atipicos.quantidade > 1 ? 's' : ''}
        </span>{' '}
        (acima de {formatar(atipicos.limiteSuperior)}; o maior foi {formatar(atipicos.maior)}) ficaram fora do gráfico. Critério: Q3 + 1,5 × IQR.
      </p>
      {r && (
        <p className="tabular-nums">
          Sem eles (n = {inteiro(r.n)}): média {formatar(r.media)}, mediana {formatar(r.mediana)}
          {desvio != null && <>, desvio padrão {formatar(desvio)}</>}.
        </p>
      )}
    </div>
  );
}

// recorta o gráfico por hora ao intervalo em que houve movimento
function recortarHoras(porHora) {
  const comMovimento = porHora.filter((h) => h.quantidade > 0).map((h) => h.hora);
  if (!comMovimento.length) return [];
  const [primeira, ultima] = [Math.min(...comMovimento), Math.max(...comMovimento)];
  return porHora.filter((h) => h.hora >= primeira && h.hora <= ultima);
}

function PainelCategorias({ titulo, itens, textoVazio, extra, moda, rotuloModa = 'Moda' }) {
  const maior = Math.max(...itens.map((i) => i.quantidade), 1);
  return (
    <PainelDashboard titulo={titulo}>
      <ListaBarras
        vazio={textoVazio}
        itens={itens.map((i) => ({
          chave: i.rotulo,
          rotulo: i.rotulo,
          proporcao: i.quantidade / maior,
          extra: extra(i),
        }))}
      />
      {itens.length > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{rotuloModa}:</span> {moda}
        </p>
      )}
    </PainelDashboard>
  );
}

// Estatística descritiva sobre os dados do período (média, mediana, moda, desvio padrão).
export default function SecaoEstatisticas({ dados, tipoDesvio }) {
  if (!dados) {
    return <p className="py-6 text-center text-sm text-ink-faint">Carregando estatísticas...</p>;
  }

  const { valorConta, itensPorConta, permanenciaMesa, tempoPreparo, horarioPico, diaSemana } = dados;
  const horas = recortarHoras(horarioPico.porHora);
  const prazo = tempoPreparo.prazo;

  const formasPagamento = dados.formaPagamento.itens.map((i) => ({ ...i, rotulo: ROTULO_PAGAMENTO[i.rotulo] ?? i.rotulo }));
  const modaPagamento = dados.formaPagamento.moda.map((m) => ROTULO_PAGAMENTO[m] ?? m).join(' e ');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <BlocoEstatistico
            titulo="Valor por conta fechada"
            resumo={valorConta.resumo}
            tipoDesvio={tipoDesvio}
            formatar={reais}
            moda={textoModa({ resumo: valorConta.resumo, histograma: valorConta.histograma, formatar: reais, formatarFaixa: faixaReais, modo: 'faixa' })}
            nota="A moda é a faixa de valor com mais contas (coluna laranja)."
          >
            <Histograma histograma={valorConta.histograma} tituloX="Valor da conta (R$)" nomeSerie="Contas" />
          </BlocoEstatistico>

          <BlocoEstatistico
            titulo="Tempo de permanência na mesa"
            resumo={permanenciaMesa.resumo}
            tipoDesvio={tipoDesvio}
            formatar={minutos}
            moda={textoModa({ resumo: permanenciaMesa.resumo, histograma: permanenciaMesa.histograma, formatar: minutos, formatarFaixa: faixaMinutos })}
            nota="Da abertura ao fechamento da comanda. Mesas esquecidas abertas puxam a média, mas pouco a mediana."
          >
            <Histograma histograma={permanenciaMesa.histograma} tituloX="Minutos" nomeSerie="Contas" />
            <AvisoAtipicos atipicos={permanenciaMesa.atipicos} formatar={minutos} tipoDesvio={tipoDesvio} />
          </BlocoEstatistico>
        </div>
        <div className="space-y-4">
          <BlocoEstatistico
            titulo="Tempo até o pedido ficar pronto"
            resumo={tempoPreparo.geral.resumo}
            tipoDesvio={tipoDesvio}
            formatar={minutos}
            moda={textoModa({ resumo: tempoPreparo.geral.resumo, histograma: tempoPreparo.geral.histograma, formatar: minutos, formatarFaixa: faixaMinutos })}
            nota="Medido do lançamento até o item ficar pronto, em minutos inteiros."
          >
            <Histograma histograma={tempoPreparo.geral.histograma} tituloX="Minutos" nomeSerie="Itens" />
            <AvisoAtipicos atipicos={tempoPreparo.geral.atipicos} formatar={minutos} tipoDesvio={tipoDesvio} />
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {[['Cozinha', tempoPreparo.cozinha], ['Bar', tempoPreparo.bar]].map(([nome, r]) => (
                <div key={nome} className="rounded-md border border-line px-3 py-2">
                  <p className="font-semibold">{nome}</p>
                  {r.n ? (
                    <p className="tabular-nums text-ink-soft">
                      média {minutos(r.media)} · mediana {minutos(r.mediana)} · desvio {minutos(desvioDe(r, tipoDesvio) ?? 0)}
                    </p>
                  ) : (
                    <p className="text-ink-faint">sem itens no período</p>
                  )}
                </div>
              ))}
            </div>
            {prazo.percentual != null && (
              <p className="text-xs text-ink-soft">
                <span className="font-semibold text-ink">{decimal(prazo.percentual)}%</span> dos itens ({inteiro(prazo.dentroDoPrazo)} de{' '}
                {inteiro(prazo.itensComPrazo)}) ficaram prontos dentro do tempo de preparo cadastrado no produto.
              </p>
            )}
          </BlocoEstatistico>

          <BlocoEstatistico
            titulo="Itens por conta"
            resumo={itensPorConta.resumo}
            tipoDesvio={tipoDesvio}
            formatar={unidades}
            moda={textoModa({ resumo: itensPorConta.resumo, formatar: unidades })}
            nota="Unidades consumidas por conta fechada, sem os itens estornados."
          >
            {itensPorConta.distribuicao && (
              <GraficoColunas
                categorias={itensPorConta.distribuicao.itens.map((i) => String(i.valor))}
                valores={itensPorConta.distribuicao.itens.map((i) => i.frequencia)}
                destaques={itensPorConta.distribuicao.modaIndices}
                tituloX="Itens na conta"
                nomeSerie="Contas"
                altura={210}
              />
            )}
          </BlocoEstatistico>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <PainelDashboard titulo="Movimento por horário (itens lançados)">
          {horas.length ? (
            <>
              <GraficoColunas
                categorias={horas.map((h) => `${h.hora}h`)}
                valores={horas.map((h) => h.quantidade)}
                destaques={horas.map((h, i) => (horarioPico.moda.includes(h.hora) ? i : -1)).filter((i) => i >= 0)}
                nomeSerie="Itens lançados"
                tituloX="Hora do dia"
                altura={210}
              />
              <p className="mt-2 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Moda (horário de pico):</span> {horarioPico.moda.map((h) => `${h}h`).join(' e ')}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-ink-faint">Sem pedidos neste período.</p>
          )}
        </PainelDashboard>

        <PainelDashboard titulo="Movimento por dia da semana">
          {dados.periodo === 'hoje' ? (
            <p className="py-8 text-center text-sm text-ink-faint">Escolha &quot;Esta semana&quot; ou &quot;Este mês&quot; para comparar os dias.</p>
          ) : diaSemana.moda.length ? (
            <>
              <GraficoColunas
                categorias={DIAS_SEMANA}
                valores={diaSemana.porDia.map((d) => d.quantidade)}
                destaques={diaSemana.moda}
                nomeSerie="Itens lançados"
                tituloX="Dia da semana"
                altura={210}
              />
              <p className="mt-2 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Moda (dia mais movimentado):</span> {diaSemana.moda.map((d) => DIAS_SEMANA[d]).join(' e ')}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-ink-faint">Sem pedidos neste período.</p>
          )}
        </PainelDashboard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PainelCategorias
          titulo="Forma de pagamento"
          itens={formasPagamento}
          textoVazio="Nenhum pagamento neste período."
          extra={(i) => `${inteiro(i.quantidade)} (${decimal(i.percentual)}%)`}
          moda={modaPagamento}
          rotuloModa="Moda (mais usada)"
        />
        <PainelCategorias
          titulo="Produtos mais vendidos (unidades)"
          itens={dados.produtoMaisVendido.itens}
          textoVazio="Nenhuma venda neste período."
          extra={(i) => `${inteiro(i.quantidade)} un.`}
          moda={dados.produtoMaisVendido.moda.join(' e ')}
          rotuloModa="Moda (mais vendido)"
        />
        <PainelCategorias
          titulo="Motivos de estorno"
          itens={dados.motivoEstorno.itens}
          textoVazio="Nenhum estorno neste período."
          extra={(i) => `${inteiro(i.quantidade)} (${decimal(i.percentual)}%)`}
          moda={dados.motivoEstorno.moda.join(' e ')}
          rotuloModa="Moda (mais comum)"
        />
      </div>
    </div>
  );
}
