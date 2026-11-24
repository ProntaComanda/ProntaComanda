import PainelDashboard from './PainelDashboard';
import { cvDe, desvioDe, interpretar } from '../../utils/estatistica';
import { decimal } from '../../utils/numero';

function Medida({ rotulo, valor, dica }) {
  return (
    <div className="min-w-0 rounded-md bg-tile px-3 py-2" title={dica}>
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-ink-soft">{rotulo}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums">{valor}</p>
    </div>
  );
}

/**
 * Painel de uma variável: média, mediana, moda, desvio padrão, coeficiente de
 * variação e mínimo/máximo, mais um gráfico opcional (children) e a leitura
 * dos resultados. `formatar` aplica a unidade (R$, min...); `moda` já vem em texto.
 */
export default function BlocoEstatistico({ titulo, resumo, tipoDesvio, formatar, moda, children, nota }) {
  const temDados = !!resumo?.n;
  const desvio = desvioDe(resumo, tipoDesvio);
  const cv = cvDe(resumo, tipoDesvio);
  const traco = (v, f) => (v == null ? '-' : f(v));

  return (
    <PainelDashboard titulo={titulo}>
      {!temDados ? (
        <p className="py-8 text-center text-sm text-ink-faint">Sem dados neste período.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Medida rotulo="Média" valor={formatar(resumo.media)} dica="Soma dos valores dividida pela quantidade (n)" />
            <Medida rotulo="Mediana" valor={formatar(resumo.mediana)} dica="Valor central dos dados em ordem crescente" />
            <Medida rotulo="Moda" valor={moda} dica="Valor (ou faixa) que mais se repete" />
            <Medida
              rotulo={`Desvio padrão ${tipoDesvio === 'populacional' ? 'pop.' : 'amostr.'}`}
              valor={traco(desvio, formatar)}
              dica="Quanto os valores se afastam, em média, da média"
            />
            <Medida
              rotulo="Coef. de variação"
              valor={traco(cv, (v) => `${decimal(v)}%`)}
              dica="Desvio padrão dividido pela média: compara a dispersão entre variáveis diferentes"
            />
            <Medida rotulo="Mín. – Máx." valor={`${formatar(resumo.minimo)} – ${formatar(resumo.maximo)}`} />
          </div>

          {children}

          <p className="text-xs leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">n = {resumo.n}.</span> {interpretar(resumo, tipoDesvio)}
            {nota && <> {nota}</>}
          </p>
        </div>
      )}
    </PainelDashboard>
  );
}
