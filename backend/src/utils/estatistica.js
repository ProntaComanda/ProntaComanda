/**
 * Funções de estatística descritiva usadas pelo Dashboard (aba "Estatísticas").
 *
 * São funções PURAS (só recebem números e devolvem números), sem banco e sem
 * Express, para poderem ser conferidas à mão e testadas sozinhas.
 *
 * Medidas:
 *  - média aritmética:      soma dos valores / n
 *  - mediana:               valor central dos dados ordenados (média dos dois
 *                           centrais quando n é par)
 *  - moda:                  valor(es) que mais se repetem (null = amodal)
 *  - variância / desvio:    amostral (divide por n-1) e populacional (divide por n)
 *  - coef. de variação:     desvio padrão / média x 100 (dispersão relativa)
 */

const arredondar = (valor, casas = 2) => {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  const fator = 10 ** casas;
  return Math.round((valor + Number.EPSILON) * fator) / fator;
};

const apenasNumeros = (valores) => (valores ?? []).filter((v) => typeof v === 'number' && Number.isFinite(v));

const soma = (valores) => valores.reduce((total, v) => total + v, 0);

function media(valores) {
  const v = apenasNumeros(valores);
  return v.length ? soma(v) / v.length : null;
}

function mediana(valores) {
  const v = apenasNumeros(valores).sort((a, b) => a - b);
  if (!v.length) return null;
  const meio = Math.floor(v.length / 2);
  return v.length % 2 ? v[meio] : (v[meio - 1] + v[meio]) / 2;
}

/**
 * Moda de valores exatos. Devolve { valores, frequencia } com TODOS os valores
 * empatados na maior frequência, ou null quando nenhum valor se repete
 * (conjunto amodal) — nesse caso falar em "moda" seria enganoso.
 */
function moda(valores) {
  const v = apenasNumeros(valores);
  if (!v.length) return null;

  const frequencias = new Map();
  for (const x of v) frequencias.set(x, (frequencias.get(x) ?? 0) + 1);

  const maior = Math.max(...frequencias.values());
  if (maior <= 1) return null;

  const empatados = [...frequencias.entries()]
    .filter(([, f]) => f === maior)
    .map(([valor]) => valor)
    .sort((a, b) => a - b);
  return { valores: empatados, frequencia: maior };
}

/** Soma dos quadrados dos desvios em relação à média. */
function somaQuadrados(valores) {
  const v = apenasNumeros(valores);
  const m = media(v);
  return v.reduce((total, x) => total + (x - m) ** 2, 0);
}

/** `amostral` = true divide por n-1 (amostra); false divide por n (população). */
function variancia(valores, amostral = true) {
  const n = apenasNumeros(valores).length;
  const divisor = amostral ? n - 1 : n;
  if (divisor < 1) return null; // amostral precisa de ao menos 2 valores
  return somaQuadrados(valores) / divisor;
}

function desvioPadrao(valores, amostral = true) {
  const v = variancia(valores, amostral);
  return v === null ? null : Math.sqrt(v);
}

function coeficienteVariacao(desvio, mediaValor) {
  if (desvio === null || mediaValor === null || mediaValor === 0) return null;
  return (desvio / Math.abs(mediaValor)) * 100;
}

/**
 * Resumo completo de um conjunto de valores. Traz os DOIS desvios padrão
 * (amostral e populacional) e o frontend escolhe qual mostrar.
 */
function resumir(valores, casas = 2) {
  const v = apenasNumeros(valores);
  if (!v.length) {
    return {
      n: 0,
      media: null,
      mediana: null,
      moda: null,
      desvioAmostral: null,
      desvioPopulacional: null,
      cvAmostral: null,
      cvPopulacional: null,
      minimo: null,
      maximo: null,
      amplitude: null,
    };
  }

  const m = media(v);
  const dA = desvioPadrao(v, true);
  const dP = desvioPadrao(v, false);
  const mo = moda(v);
  const minimo = Math.min(...v);
  const maximo = Math.max(...v);

  return {
    n: v.length,
    media: arredondar(m, casas),
    mediana: arredondar(mediana(v), casas),
    moda: mo ? { valores: mo.valores.map((x) => arredondar(x, casas)), frequencia: mo.frequencia } : null,
    desvioAmostral: arredondar(dA, casas),
    desvioPopulacional: arredondar(dP, casas),
    cvAmostral: arredondar(coeficienteVariacao(dA, m), 1),
    cvPopulacional: arredondar(coeficienteVariacao(dP, m), 1),
    minimo: arredondar(minimo, casas),
    maximo: arredondar(maximo, casas),
    amplitude: arredondar(maximo - minimo, casas),
  };
}

// escolhe uma largura de faixa "redonda" (1, 2, 2.5, 5 ou 10 x potência de 10)
function larguraBonita(bruta) {
  if (!(bruta > 0)) return 1;
  const potencia = 10 ** Math.floor(Math.log10(bruta));
  const fracao = bruta / potencia;
  const bonito = [1, 2, 2.5, 5, 10].find((n) => fracao <= n) ?? 10;
  return bonito * potencia;
}

/**
 * Distribuição de frequências em classes [de, ate) de mesma largura.
 * O número de classes segue a regra de Sturges (1 + log2 n), limitado a 4..8.
 * `faixaModal` é o índice da classe com maior frequência (classe modal), que é
 * a "moda" apropriada para dados contínuos (R$, minutos com decimais).
 */
function histograma(valores) {
  const v = apenasNumeros(valores);
  if (!v.length) return { faixas: [], faixaModal: null };

  const minimo = Math.min(...v);
  const maximo = Math.max(...v);

  if (minimo === maximo) {
    return { faixas: [{ de: minimo, ate: maximo, frequencia: v.length }], faixaModal: 0 };
  }

  const alvo = Math.min(8, Math.max(4, Math.ceil(1 + Math.log2(v.length))));
  const largura = larguraBonita((maximo - minimo) / alvo);
  const inicio = Math.floor(minimo / largura) * largura;
  const quantidade = Math.floor((maximo - inicio) / largura) + 1;

  const faixas = Array.from({ length: quantidade }, (_, i) => ({
    de: arredondar(inicio + i * largura, 4),
    ate: arredondar(inicio + (i + 1) * largura, 4),
    frequencia: 0,
  }));
  for (const x of v) faixas[Math.floor((x - inicio) / largura)].frequencia += 1;

  const maior = Math.max(...faixas.map((f) => f.frequencia));
  return { faixas, faixaModal: faixas.findIndex((f) => f.frequencia === maior) };
}

/**
 * Contagem de categorias (forma de pagamento, motivo de estorno...).
 * Devolve os itens em ordem decrescente e a(s) moda(s): categorias empatadas
 * na maior frequência.
 */
function contarCategorias(rotulos) {
  const contagem = new Map();
  for (const r of rotulos ?? []) {
    if (r === null || r === undefined || r === '') continue;
    contagem.set(r, (contagem.get(r) ?? 0) + 1);
  }
  const total = soma([...contagem.values()]);
  const itens = [...contagem.entries()]
    .map(([rotulo, quantidade]) => ({
      rotulo,
      quantidade,
      percentual: total ? arredondar((quantidade / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || String(a.rotulo).localeCompare(String(b.rotulo)));

  const maior = itens[0]?.quantidade ?? 0;
  return { total, itens, moda: itens.filter((i) => i.quantidade === maior && maior > 0).map((i) => i.rotulo) };
}

module.exports = {
  arredondar,
  media,
  mediana,
  moda,
  variancia,
  desvioPadrao,
  coeficienteVariacao,
  resumir,
  histograma,
  contarCategorias,
};
