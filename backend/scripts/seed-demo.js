/**
 * Dados de DEMONSTRAÇÃO para o Dashboard: gera comandas já fechadas, itens com
 * tempos de preparo, pagamentos e alguns estornos/descontos, distribuídos entre
 * vários garçons. Serve para apresentar a aba de Estatísticas e o desempenho
 * por funcionário com números que fazem sentido.
 *
 * Todo registro criado fica marcado com `demo: true`. NÃO são dados reais.
 *
 * Pré-requisito: rodar antes o seed principal (funcionários, produtos, mesas).
 *
 * Como rodar:
 *   com Docker:  docker compose exec backend node scripts/seed-demo.js
 *   sem Docker:  cd backend && npm run seed:demo
 *
 * Opções:
 *   --dias=N       quantos dias para trás gerar (padrão 21; nunca antes do dia 1
 *                  do mês atual — veja o aviso abaixo)
 *   --semente=N    número da semente aleatória (mesma semente = mesmos dados)
 *   --limpar       apaga só os registros demo (comandas e pagamentos com demo:true)
 *   --forcar       permite rodar com NODE_ENV=production (por segurança, bloqueado)
 *   SEED_SENHA     senha dos garçons de exemplo criados (padrão senha123)
 *
 * AVISO: o rollup mensal consolida e apaga os dados do mês anterior. Rode
 * `--limpar` antes da virada do mês se não quiser que os dados de demonstração
 * entrem no histórico (ResumoMensal).
 */
require('dotenv').config();
const argon2 = require('argon2');
const mongoose = require('mongoose');
const { Funcionario, Produto, Mesa, Comanda, Pagamento } = require('../src/models');
const { dayjs, TIMEZONE } = require('../src/utils/periodo');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// PRNG determinístico (mulberry32): a mesma semente gera sempre os mesmos dados
function criarAleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cpfComDigitos(base9) {
  const digito = (nums) => {
    const soma = nums.reduce((t, n, i) => t + n * (nums.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const nums = base9.split('').map(Number);
  const d1 = digito(nums);
  const d2 = digito([...nums, d1]);
  return `${base9}${d1}${d2}`;
}

const arredondar = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

// CPFs de teste com dígitos verificadores válidos (não pertencem a ninguém).
const GARCONS_EXEMPLO = [
  { nome: 'Marina Souza', cpf: cpfComDigitos('248163270') },
  { nome: 'João Pereira', cpf: cpfComDigitos('135792468') },
  { nome: 'Beatriz Lima', cpf: cpfComDigitos('864209753') },
];

const MOTIVOS_ESTORNO = [
  ['Pedido errado', 4],
  ['Cliente desistiu', 3],
  ['Demora no preparo', 2],
  ['Item indisponível', 1],
];

// horas de movimento (almoço e jantar) e o peso de cada uma
const HORAS = [
  [11, 3], [12, 6], [13, 5], [14, 2],
  [18, 3], [19, 6], [20, 8], [21, 6], [22, 2],
];
// movimento por dia da semana (0 = domingo)
const FATOR_DIA = [1.3, 0.7, 0.7, 0.8, 1.0, 1.6, 1.7];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function main() {
  const argumentos = process.argv.slice(2);
  const opcao = (nome, padrao) => {
    const achado = argumentos.find((a) => a.startsWith(`--${nome}=`));
    return achado ? achado.split('=')[1] : padrao;
  };
  const dias = Math.max(1, Number(opcao('dias', 21)) || 21);
  const semente = Number(opcao('semente', 2026)) || 2026;
  const limpar = argumentos.includes('--limpar');
  const forcar = argumentos.includes('--forcar');

  if (process.env.NODE_ENV === 'production' && !forcar) {
    throw new Error('NODE_ENV=production: o seed de demonstração foi bloqueado (use --forcar se tiver certeza).');
  }
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI não definida (veja o .env do backend).');

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`\nBanco: ${mongoose.connection.name}\n`);

  if (limpar) {
    const [c, p] = await Promise.all([Comanda.deleteMany({ demo: true }), Pagamento.deleteMany({ demo: true })]);
    console.log(`Removidos: ${c.deletedCount} comandas e ${p.deletedCount} pagamentos de demonstração.`);
    console.log('Os garçons de exemplo continuam cadastrados (remova pela tela de Funcionários, se quiser).');
    return;
  }

  // --- garçons de exemplo (só cria o que ainda não existe) -----------------
  const senhaHash = await argon2.hash(process.env.SEED_SENHA || 'senha123');
  for (const g of GARCONS_EXEMPLO) {
    if (await Funcionario.exists({ cpf: g.cpf })) continue;
    await Funcionario.create({ ...g, perfil: 'garcom', senhaHash });
    console.log(`  + garçom ${g.nome}`);
  }

  const [garcons, caixas, admins, cozinha, bar, produtos, mesas] = await Promise.all([
    Funcionario.find({ perfil: 'garcom', ativo: true }).sort({ nome: 1 }).lean(),
    Funcionario.find({ perfil: 'caixa', ativo: true }).lean(),
    Funcionario.find({ perfil: 'administrador', ativo: true }).lean(),
    Funcionario.find({ perfil: 'cozinha', ativo: true }).lean(),
    Funcionario.find({ perfil: 'bar', ativo: true }).lean(),
    Produto.find({ ativo: true }).sort({ nome: 1 }).lean(),
    Mesa.find({ ativo: true }).sort({ numero: 1 }).lean(),
  ]);

  if (!produtos.length || !mesas.length || !(caixas.length || admins.length)) {
    throw new Error('Faltam produtos, mesas ou caixa/administrador. Rode antes o seed principal (scripts/seed.js).');
  }
  const caixa = (caixas[0] ?? admins[0])._id;
  const admin = (admins[0] ?? caixas[0])._id;
  const usuarioDoSetor = (setor) => ((setor === 'bar' ? bar[0] : cozinha[0]) ?? admins[0] ?? caixas[0])._id;

  const rand = criarAleatorio(semente);
  const entre = (min, max) => min + rand() * (max - min);
  const inteiroEntre = (min, max) => Math.floor(entre(min, max + 1));
  const sorteioPonderado = (pares) => {
    const total = pares.reduce((t, [, peso]) => t + peso, 0);
    let ponto = rand() * total;
    for (const [valor, peso] of pares) {
      ponto -= peso;
      if (ponto <= 0) return valor;
    }
    return pares[pares.length - 1][0];
  };
  // distribuição "em sino" (soma de 3 sorteios): a maioria perto do meio
  const sino = (min, max) => min + ((rand() + rand() + rand()) / 3) * (max - min);

  // garçons com cargas de trabalho diferentes (o primeiro trabalha mais)
  const pesosGarcons = garcons.map((g, i) => [g, Math.max(0.4, 1.5 - i * 0.35)]);
  const pesosProdutos = produtos.map((p, i) => [p, 1 / (1 + i * 0.3)]);

  // numeração sequencial por mesa continua de onde parou
  const maiores = await Comanda.aggregate([{ $group: { _id: '$mesa', max: { $max: '$numero' } } }]);
  const proximoNumero = new Map(maiores.map((m) => [String(m._id), m.max + 1]));

  const agora = dayjs().tz(TIMEZONE);
  const inicioMes = agora.startOf('month');
  const comandasDocs = [];
  const pagamentosDocs = [];

  for (let offset = dias - 1; offset >= 0; offset--) {
    const dia = agora.startOf('day').subtract(offset, 'day');
    if (dia.isBefore(inicioMes)) continue; // nunca gera antes do mês atual (rollup)

    const quantidade = Math.max(3, Math.round(14 * FATOR_DIA[dia.day()] + entre(-2, 2)));

    for (let n = 0; n < quantidade; n++) {
      const hora = sorteioPonderado(HORAS);
      const abertaEm = dia.hour(hora).minute(inteiroEntre(0, 59)).second(inteiroEntre(0, 59));
      const garcom = sorteioPonderado(pesosGarcons);
      const mesa = mesas[inteiroEntre(0, mesas.length - 1)];

      // itens, lançados em 1 a 3 rodadas (o cliente pede de novo mais tarde)
      const rodadas = sorteioPonderado([[1, 6], [2, 3], [3, 1]]);
      const totalLinhas = inteiroEntre(2, 7);
      const horariosRodada = Array.from({ length: rodadas }, (_, r) =>
        abertaEm.add(r === 0 ? inteiroEntre(2, 6) : inteiroEntre(18, 35) * r, 'minute')
      );

      const itens = [];
      let ultimaEntrega = abertaEm;
      for (let l = 0; l < totalLinhas; l++) {
        const produto = sorteioPonderado(pesosProdutos);
        const lancadoEm = horariosRodada[inteiroEntre(0, rodadas - 1)].add(inteiroEntre(0, 40), 'second');
        const prazo = produto.tempoPreparoMinutos ?? 10;
        const horaDeFila = [12, 13, 20, 21].includes(lancadoEm.hour()) ? entre(0, 6) : entre(0, 2);
        const minutosPreparo = Math.max(1, sino(prazo * 0.6, prazo * 1.5) + horaDeFila);
        const estornado = rand() < 0.04;
        const setor = produto.setor ?? 'cozinha';

        const item = {
          _id: new mongoose.Types.ObjectId(),
          produto: produto._id,
          nomeProduto: produto.nome,
          precoUnitario: produto.preco,
          tempoPreparoMinutos: produto.tempoPreparoMinutos ?? null,
          quantidade: sorteioPonderado([[1, 65], [2, 25], [3, 10]]),
          setorPreparo: setor,
          lancadoEm: lancadoEm.toDate(),
          lancadoPor: garcom._id,
          origem: 'funcionario',
          estornado,
          emPreparoEm: null,
          prontoEm: null,
          entregueEm: null,
          prontoPor: null,
          entreguePor: null,
          statusKDS: 'entregue',
        };

        if (estornado) {
          item.statusKDS = 'em_preparo';
          item.emPreparoEm = lancadoEm.add(1, 'minute').toDate();
          item.motivoEstorno = sorteioPonderado(MOTIVOS_ESTORNO);
          item.estornadoPor = rand() < 0.7 ? caixa : admin;
          item.estornadoEm = lancadoEm.add(inteiroEntre(5, 15), 'minute').toDate();
        } else {
          const prontoEm = lancadoEm.add(Math.round(minutosPreparo * 60), 'second');
          const entregueEm = prontoEm.add(inteiroEntre(60, 240), 'second');
          item.emPreparoEm = lancadoEm.add(Math.min(120, Math.round(minutosPreparo * 20)), 'second').toDate();
          item.prontoEm = prontoEm.toDate();
          item.entregueEm = entregueEm.toDate();
          item.prontoPor = usuarioDoSetor(setor);
          item.entreguePor = usuarioDoSetor(setor);
          if (entregueEm.isAfter(ultimaEntrega)) ultimaEntrega = entregueEm;
        }
        itens.push(item);
      }

      const subtotal = arredondar(
        itens.filter((i) => !i.estornado).reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0)
      );
      if (subtotal <= 0) continue;

      // permanência: tempo até a última entrega + o tempo comendo; às vezes uma mesa "esquecida"
      const comendo = rand() < 0.03 ? inteiroEntre(120, 240) : Math.round(sino(10, 50));
      const fechadaEm = ultimaEntrega.add(comendo, 'minute');
      if (fechadaEm.isAfter(agora)) continue; // não inventa conta no futuro

      const comDesconto = rand() < 0.06;
      const descontoValor = comDesconto ? arredondar(subtotal * 0.1) : 0;
      const taxa = arredondar((subtotal - descontoValor) * 0.1);
      const total = arredondar(subtotal - descontoValor + taxa);

      const mesaId = String(mesa._id);
      const numero = proximoNumero.get(mesaId) ?? 1;
      proximoNumero.set(mesaId, numero + 1);

      const comandaId = new mongoose.Types.ObjectId();
      comandasDocs.push({
        _id: comandaId,
        mesa: mesa._id,
        numero,
        status: 'fechada',
        abertaEm: abertaEm.toDate(),
        abertaPor: garcom._id,
        fechadaEm: fechadaEm.toDate(),
        fechadaPor: caixa,
        itens,
        desconto: {
          tipo: 'percentual',
          valor: comDesconto ? 10 : 0,
          observacao: comDesconto ? 'Desconto de demonstração' : undefined,
          aplicadoPor: comDesconto ? admin : null,
        },
        taxaServico: { percentual: 10, valor: taxa },
        subtotal,
        total,
        demo: true,
        createdAt: abertaEm.toDate(),
        updatedAt: fechadaEm.toDate(),
        __v: 0,
      });

      // forma de pagamento: a maioria em um método só; às vezes a conta é dividida
      const tipo = sorteioPonderado([['pix', 45], ['cartao', 40], ['dinheiro', 15]]);
      let metodos;
      let troco = 0;
      if (rand() < 0.1) {
        const parte = arredondar(total / 2);
        metodos = [{ tipo: 'pix', valor: parte }, { tipo: 'dinheiro', valor: arredondar(total - parte) }];
      } else if (tipo === 'dinheiro') {
        const recebido = Math.ceil(total / 10) * 10;
        troco = arredondar(recebido - total);
        metodos = [{ tipo, valor: recebido }];
      } else {
        metodos = [{ tipo, valor: total }];
      }

      pagamentosDocs.push({
        _id: new mongoose.Types.ObjectId(),
        mesa: mesa._id,
        comandas: [comandaId],
        valorTotal: total,
        metodos,
        troco,
        recebidoPor: caixa,
        estornado: false,
        estornadoEm: null,
        estornadoPor: null,
        demo: true,
        createdAt: fechadaEm.toDate(),
        updatedAt: fechadaEm.toDate(),
        __v: 0,
      });
    }
  }

  if (!comandasDocs.length) {
    console.log('Nada a gerar (o mês atual acabou de começar?). Tente de novo mais tarde.');
    return;
  }

  // inserção direta na coleção: respeita exatamente as datas geradas acima
  await Comanda.collection.insertMany(comandasDocs);
  await Pagamento.collection.insertMany(pagamentosDocs);

  const itensTotal = comandasDocs.reduce((soma, c) => soma + c.itens.length, 0);
  console.log(`Gerados: ${comandasDocs.length} comandas fechadas, ${itensTotal} itens e ${pagamentosDocs.length} pagamentos (demo).`);
  console.log(`Período: ${dayjs(comandasDocs[0].abertaEm).tz(TIMEZONE).format('DD/MM')} a ${agora.format('DD/MM')} (semente ${semente}).`);
  console.log('Para apagar: node scripts/seed-demo.js --limpar');
}

main()
  .catch((erro) => {
    console.error(`\nErro: ${erro.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
