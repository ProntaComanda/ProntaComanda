const asyncHandler = require('../utils/asyncHandler');
const { Comanda, Pagamento, Funcionario, PedidoCliente } = require('../models');
const { dayjs, TIMEZONE, limitesDoPeriodo } = require('../utils/periodo');
const { resumir, histograma, contarCategorias, separarAtipicos, arredondar } = require('../utils/estatistica');

/**
 * Estatística descritiva do Dashboard (disciplina de Estatística Aplicada).
 *
 * Tudo é calculado sobre os registros do período filtrado (hoje / semana /
 * mês). Os registros individuais do mês anterior são expurgados pelo rollup
 * mensal (RF15), então a janela "semana" que atravessa a virada do mês só
 * enxerga a parte que ainda existe — o frontend avisa isso.
 */

const minutosEntre = (inicio, fim) => (new Date(fim) - new Date(inicio)) / 60000;

const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);

// Resumo sobre TODOS os valores (média e mediana juntas mostram o efeito dos
// atípicos) + histograma só com os valores normais, para uma única comanda
// esquecida aberta por semanas não achatar o gráfico. Os atípicos são
// informados à parte, com o resumo recalculado sem eles.
function comAtipicos(valores, casas) {
  const { normais, atipicos, limiteSuperior } = separarAtipicos(valores);
  return {
    resumo: resumir(valores, casas),
    histograma: histograma(normais),
    atipicos: {
      quantidade: atipicos.length,
      limiteSuperior: arredondar(limiteSuperior, 1),
      maior: atipicos.length ? Math.max(...atipicos) : null,
      resumoSemAtipicos: atipicos.length ? resumir(normais, casas) : null,
    },
  };
}

// Dado inteiro (itens por conta): uma barra por valor, de mínimo a máximo, com zeros
// nos valores que não ocorreram. É a distribuição de frequência de uma variável
// discreta e mostra a moda exata. Com amplitude grande, devolve null.
function distribuicaoDiscreta(valores) {
  if (!valores.length) return null;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  if (maximo - minimo > 24) return null;

  const frequencias = new Map();
  for (const v of valores) frequencias.set(v, (frequencias.get(v) ?? 0) + 1);
  const maior = Math.max(...frequencias.values());

  const itens = Array.from({ length: maximo - minimo + 1 }, (_, i) => ({
    valor: minimo + i,
    frequencia: frequencias.get(minimo + i) ?? 0,
  }));
  return { itens, modaIndices: itens.map((x, i) => (x.frequencia === maior ? i : -1)).filter((i) => i >= 0) };
}

function intervalo(periodo) {
  const agora = dayjs().tz(TIMEZONE);
  const { inicio, fim } = limitesDoPeriodo(periodo, agora);
  return { inicio, fim, de: inicio.toDate(), ate: fim.toDate() };
}

// itens lançados no intervalo, "achatados" (um documento por item), só com o que as estatísticas usam
function itensDoIntervalo(de, ate) {
  return Comanda.aggregate([
    { $match: { 'itens.lancadoEm': { $gte: de, $lte: ate } } },
    { $unwind: '$itens' },
    { $match: { 'itens.lancadoEm': { $gte: de, $lte: ate } } },
    {
      $project: {
        _id: 0,
        lancadoEm: '$itens.lancadoEm',
        prontoEm: '$itens.prontoEm',
        setor: '$itens.setorPreparo',
        prazo: '$itens.tempoPreparoMinutos',
        estornado: '$itens.estornado',
        motivoEstorno: '$itens.motivoEstorno',
        nomeProduto: '$itens.nomeProduto',
        quantidade: '$itens.quantidade',
      },
    },
  ]);
}

// GET /dashboard/estatisticas?periodo=hoje|semana|mes
const estatisticas = asyncHandler(async (req, res) => {
  const { periodo } = req.query;
  const { inicio, fim, de, ate } = intervalo(periodo);

  const [comandas, itens, pagamentos] = await Promise.all([
    Comanda.find({ status: 'fechada', fechadaEm: { $gte: de, $lte: ate } })
      .select('abertaEm fechadaEm total itens.quantidade itens.estornado')
      .lean(),
    itensDoIntervalo(de, ate),
    Pagamento.find({ createdAt: { $gte: de, $lte: ate }, estornado: false })
      .select('metodos.tipo')
      .lean(),
  ]);

  // --- por conta fechada ---------------------------------------------------
  const valoresConta = comandas.map((c) => c.total).filter((t) => t > 0);
  const itensPorConta = comandas
    .map((c) => c.itens.filter((i) => !i.estornado).reduce((soma, i) => soma + i.quantidade, 0))
    .filter((q) => q > 0);
  const permanencia = comandas
    .filter((c) => c.abertaEm && c.fechadaEm)
    .map((c) => Math.round(minutosEntre(c.abertaEm, c.fechadaEm)))
    .filter((m) => m >= 0);

  // --- tempo de preparo (lançamento -> pronto), em minutos inteiros -------
  const preparados = itens
    .filter((i) => !i.estornado && i.prontoEm)
    .map((i) => ({ ...i, minutos: Math.round(minutosEntre(i.lancadoEm, i.prontoEm)) }))
    .filter((i) => i.minutos >= 0);
  const comPrazo = preparados.filter((i) => i.prazo > 0);
  const dentroDoPrazo = comPrazo.filter((i) => i.minutos <= i.prazo).length;

  // --- quando o movimento acontece (itens lançados, no fuso do estabelecimento) ---
  const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, quantidade: 0 }));
  const porDia = Array.from({ length: 7 }, (_, dia) => ({ dia, quantidade: 0 })); // 0 = domingo
  for (const item of itens) {
    const momento = dayjs(item.lancadoEm).tz(TIMEZONE);
    porHora[momento.hour()].quantidade += 1;
    porDia[momento.day()].quantidade += 1;
  }
  const picos = (lista, chave) => {
    const maior = Math.max(...lista.map((l) => l.quantidade));
    return maior > 0 ? lista.filter((l) => l.quantidade === maior).map((l) => l[chave]) : [];
  };

  // --- categorias ----------------------------------------------------------
  const formasPagamento = contarCategorias(
    pagamentos.flatMap((p) => [...new Set((p.metodos ?? []).map((m) => m.tipo))])
  );

  const motivos = contarCategorias(
    itens.filter((i) => i.estornado && i.motivoEstorno?.trim()).map((i) => i.motivoEstorno.trim().toLowerCase())
  );
  motivos.itens = motivos.itens.slice(0, 5).map((m) => ({ ...m, rotulo: capitalizar(m.rotulo) }));
  motivos.moda = motivos.moda.map(capitalizar);

  const unidadesPorProduto = new Map();
  for (const i of itens.filter((x) => !x.estornado)) {
    unidadesPorProduto.set(i.nomeProduto, (unidadesPorProduto.get(i.nomeProduto) ?? 0) + i.quantidade);
  }
  const produtos = [...unidadesPorProduto.entries()]
    .map(([nome, quantidade]) => ({ rotulo: nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.rotulo.localeCompare(b.rotulo));
  const maiorVenda = produtos[0]?.quantidade ?? 0;

  res.json({
    periodo,
    intervalo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    contasFechadas: comandas.length,

    valorConta: { resumo: resumir(valoresConta), histograma: histograma(valoresConta) },
    itensPorConta: { resumo: resumir(itensPorConta), distribuicao: distribuicaoDiscreta(itensPorConta) },
    permanenciaMesa: comAtipicos(permanencia, 1),

    tempoPreparo: {
      geral: comAtipicos(preparados.map((i) => i.minutos), 1),
      cozinha: resumir(preparados.filter((i) => i.setor === 'cozinha').map((i) => i.minutos), 1),
      bar: resumir(preparados.filter((i) => i.setor === 'bar').map((i) => i.minutos), 1),
      prazo: {
        itensComPrazo: comPrazo.length,
        dentroDoPrazo,
        percentual: comPrazo.length ? arredondar((dentroDoPrazo / comPrazo.length) * 100, 1) : null,
      },
    },

    horarioPico: { totalItens: itens.length, porHora, moda: picos(porHora, 'hora') },
    diaSemana: { totalItens: itens.length, porDia, moda: picos(porDia, 'dia') },

    formaPagamento: formasPagamento,
    motivoEstorno: motivos,
    produtoMaisVendido: {
      itens: produtos.slice(0, 5),
      moda: maiorVenda > 0 ? produtos.filter((p) => p.quantidade === maiorVenda).map((p) => p.rotulo) : [],
    },
  });
});

// ---------------------------------------------------------------------------
// Desempenho por funcionário
// ---------------------------------------------------------------------------

const id = (valor) => (valor ? String(valor) : null);

// GET /dashboard/equipe?periodo=hoje|semana|mes
const equipe = asyncHandler(async (req, res) => {
  const { periodo } = req.query;
  const { inicio, fim, de, ate } = intervalo(periodo);
  const noPeriodo = (campo) => ({ [campo]: { $gte: de, $lte: ate } });

  const itensDoPeriodo = (extra = []) => [
    { $match: { itens: { $elemMatch: { $or: [noPeriodo('lancadoEm'), noPeriodo('estornadoEm'), noPeriodo('entregueEm'), noPeriodo('prontoEm')] } } } },
    { $unwind: '$itens' },
    ...extra,
  ];

  const [funcionarios, lancados, estornos, prontos, entregas, abertas, fechadas, recebidos, pedidosCliente] =
    await Promise.all([
      Funcionario.find().select('nome perfil ativo').lean(),

      // lançamentos: itens, unidades, valor vendido e comandas distintas (= mesas atendidas)
      Comanda.aggregate(
        itensDoPeriodo([
          { $match: { 'itens.lancadoEm': { $gte: de, $lte: ate }, 'itens.lancadoPor': { $ne: null } } },
          {
            $group: {
              _id: '$itens.lancadoPor',
              itens: { $sum: 1 },
              unidades: { $sum: '$itens.quantidade' },
              valor: {
                $sum: { $cond: ['$itens.estornado', 0, { $multiply: ['$itens.precoUnitario', '$itens.quantidade'] }] },
              },
              comandas: { $addToSet: '$_id' },
            },
          },
        ])
      ),

      Comanda.aggregate(
        itensDoPeriodo([
          { $match: { 'itens.estornadoEm': { $gte: de, $lte: ate }, 'itens.estornadoPor': { $ne: null } } },
          { $group: { _id: '$itens.estornadoPor', quantidade: { $sum: 1 } } },
        ])
      ),

      Comanda.aggregate(
        itensDoPeriodo([
          { $match: { 'itens.prontoEm': { $gte: de, $lte: ate }, 'itens.prontoPor': { $ne: null } } },
          { $group: { _id: '$itens.prontoPor', quantidade: { $sum: 1 } } },
        ])
      ),

      Comanda.aggregate(
        itensDoPeriodo([
          { $match: { 'itens.entregueEm': { $gte: de, $lte: ate }, 'itens.entreguePor': { $ne: null } } },
          { $group: { _id: '$itens.entreguePor', quantidade: { $sum: 1 } } },
        ])
      ),

      Comanda.aggregate([
        { $match: { ...noPeriodo('abertaEm'), abertaPor: { $ne: null } } },
        { $group: { _id: '$abertaPor', quantidade: { $sum: 1 } } },
      ]),

      Comanda.aggregate([
        { $match: { status: 'fechada', ...noPeriodo('fechadaEm'), fechadaPor: { $ne: null } } },
        {
          $group: {
            _id: '$fechadaPor',
            quantidade: { $sum: 1 },
            valor: { $sum: '$total' },
            descontos: { $sum: { $cond: [{ $gt: ['$desconto.valor', 0] }, 1, 0] } },
          },
        },
      ]),

      Pagamento.aggregate([
        { $match: { ...noPeriodo('createdAt'), estornado: false } },
        { $group: { _id: '$recebidoPor', quantidade: { $sum: 1 }, valor: { $sum: '$valorTotal' } } },
      ]),

      PedidoCliente.aggregate([
        { $match: { ...noPeriodo('resolvidoEm'), resolvidoPor: { $ne: null } } },
        {
          $group: {
            _id: { por: '$resolvidoPor', status: '$status' },
            quantidade: { $sum: 1 },
            somaMs: { $sum: { $subtract: ['$resolvidoEm', '$createdAt'] } },
          },
        },
      ]),
    ]);

  const linhas = new Map(
    funcionarios.map((f) => [
      id(f._id),
      {
        id: id(f._id),
        nome: f.nome,
        perfil: f.perfil,
        ativo: f.ativo,
        itensLancados: 0,
        unidadesLancadas: 0,
        valorLancado: 0,
        mesasAtendidas: 0,
        comandasAbertas: 0,
        contasFechadas: 0,
        valorFechado: 0,
        descontosAplicados: 0,
        valorRecebido: 0,
        estornos: 0,
        itensProntos: 0,
        entregas: 0,
        pedidosClienteAceitos: 0,
        pedidosClienteRecusados: 0,
        _somaRespostaMs: 0,
      },
    ])
  );
  const linha = (funcionarioId) => linhas.get(id(funcionarioId));

  for (const r of lancados) {
    const l = linha(r._id);
    if (!l) continue;
    l.itensLancados = r.itens;
    l.unidadesLancadas = r.unidades;
    l.valorLancado = arredondar(r.valor);
    l.mesasAtendidas = r.comandas.length;
  }
  for (const r of estornos) if (linha(r._id)) linha(r._id).estornos = r.quantidade;
  for (const r of prontos) if (linha(r._id)) linha(r._id).itensProntos = r.quantidade;
  for (const r of entregas) if (linha(r._id)) linha(r._id).entregas = r.quantidade;
  for (const r of abertas) if (linha(r._id)) linha(r._id).comandasAbertas = r.quantidade;
  for (const r of fechadas) {
    const l = linha(r._id);
    if (!l) continue;
    l.contasFechadas = r.quantidade;
    l.valorFechado = arredondar(r.valor);
    l.descontosAplicados = r.descontos;
  }
  for (const r of recebidos) if (linha(r._id)) linha(r._id).valorRecebido = arredondar(r.valor);
  for (const r of pedidosCliente) {
    const l = linha(r._id.por);
    if (!l) continue;
    if (r._id.status === 'aceito') l.pedidosClienteAceitos = r.quantidade;
    if (r._id.status === 'recusado') l.pedidosClienteRecusados = r.quantidade;
    l._somaRespostaMs += r.somaMs;
  }

  const metricasDeAtividade = [
    'itensLancados', 'comandasAbertas', 'contasFechadas', 'valorRecebido', 'estornos',
    'itensProntos', 'entregas', 'pedidosClienteAceitos', 'pedidosClienteRecusados',
  ];

  const lista = [...linhas.values()]
    // quem teve atividade no período + garçons ativos (para a ausência de pedidos também aparecer)
    .filter((l) => metricasDeAtividade.some((m) => l[m] > 0) || (l.ativo && l.perfil === 'garcom'))
    .map(({ _somaRespostaMs, ...l }) => {
      const respondidos = l.pedidosClienteAceitos + l.pedidosClienteRecusados;
      return {
        ...l,
        ticketMedio: l.contasFechadas ? arredondar(l.valorFechado / l.contasFechadas) : null,
        valorPorMesa: l.mesasAtendidas ? arredondar(l.valorLancado / l.mesasAtendidas) : null,
        tempoRespostaClienteMin: respondidos ? arredondar(_somaRespostaMs / respondidos / 60000, 1) : null,
      };
    })
    .sort((a, b) => b.itensLancados - a.itensLancados || a.nome.localeCompare(b.nome));

  // Média, mediana e desvio ENTRE os funcionários que lançaram pedidos: mostra
  // o "padrão da equipe" e quem foge dele (o frontend calcula o z-score).
  const quemLancou = lista.filter((l) => l.itensLancados > 0);
  res.json({
    periodo,
    intervalo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    funcionarios: lista,
    comparativo: {
      funcionariosComPedidos: quemLancou.length,
      itensLancados: resumir(quemLancou.map((l) => l.itensLancados)),
      valorLancado: resumir(quemLancou.map((l) => l.valorLancado)),
      mesasAtendidas: resumir(quemLancou.map((l) => l.mesasAtendidas)),
    },
  });
});

module.exports = { estatisticas, equipe };
