import { decimal } from './numero';

export const TIPOS_DESVIO = [
  { valor: 'amostral', rotulo: 'Amostral (n-1)', curto: 'amostral' },
  { valor: 'populacional', rotulo: 'Populacional (n)', curto: 'populacional' },
];

// o backend devolve os dois desvios padrão; aqui escolhemos qual mostrar
export const desvioDe = (resumo, tipo) =>
  tipo === 'populacional' ? resumo?.desvioPopulacional : resumo?.desvioAmostral;

export const cvDe = (resumo, tipo) => (tipo === 'populacional' ? resumo?.cvPopulacional : resumo?.cvAmostral);

/** Quantos desvios padrão o valor está acima (+) ou abaixo (-) da média; null se não der para calcular. */
export function zScore(valor, resumo, tipo) {
  const desvio = desvioDe(resumo, tipo);
  if (valor == null || resumo?.media == null || !desvio) return null;
  return (valor - resumo.media) / desvio;
}

export const comSinal = (numero, casas = 1) => `${numero > 0 ? '+' : ''}${decimal(numero, casas)}`;

// "4", "4 e 7", "4, 7 e 9", "4, 7, 9 e mais 2"
export function juntarLista(itens) {
  if (itens.length <= 1) return itens.join('');
  if (itens.length <= 3) return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
  return `${itens.slice(0, 3).join(', ')} e mais ${itens.length - 3}`;
}

/**
 * Texto da moda. Para dados contínuos (R$, minutos) a moda é a CLASSE modal do
 * histograma (`modo: 'faixa'`); para contagens inteiras vale o valor exato que
 * mais se repete (`modo: 'exata'`, com a classe modal como reserva quando
 * nenhum valor se repete).
 */
export function textoModa({ resumo, histograma, formatar, formatarFaixa, modo = 'exata' }) {
  if (!resumo?.n) return '-';
  const faixa = histograma?.faixaModal != null ? histograma.faixas[histograma.faixaModal] : null;
  const textoFaixa = faixa && formatarFaixa ? formatarFaixa(faixa) : null;

  if (modo === 'faixa' && textoFaixa) return textoFaixa;
  if (resumo.moda) return juntarLista(resumo.moda.valores.map(formatar));
  return textoFaixa ?? 'amodal';
}

/** Leitura em linguagem simples: o que a média x mediana e o coeficiente de variação indicam. */
export function interpretar(resumo, tipo) {
  if (!resumo?.n) return '';
  if (resumo.n < 3) return 'Poucos dados no período para interpretar a distribuição.';

  const partes = [];
  const { media, mediana } = resumo;
  const folga = media ? Math.abs(media - mediana) / Math.abs(media) : 0;

  if (folga < 0.05) {
    partes.push('Média e mediana próximas: a distribuição é aproximadamente simétrica.');
  } else if (media > mediana) {
    partes.push('Média acima da mediana: alguns valores altos puxam a média para cima (assimetria à direita).');
  } else {
    partes.push('Média abaixo da mediana: alguns valores baixos puxam a média para baixo (assimetria à esquerda).');
  }

  const cv = cvDe(resumo, tipo);
  if (cv != null) {
    const nivel = cv < 15 ? 'baixa' : cv <= 30 ? 'moderada' : 'alta';
    partes.push(`Coeficiente de variação de ${decimal(cv)}%: dispersão ${nivel}.`);
  }
  return partes.join(' ');
}
