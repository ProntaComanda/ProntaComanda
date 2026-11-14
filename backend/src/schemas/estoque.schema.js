const { z } = require('zod');
const { temNoMaximoTresCasas } = require('../utils/quantidade');

/**
 * RF10 - Gestão e Entrada de Estoque
 * Unidades fechadas para não deixar "kilo", "Kg", "unidades" etc. se
 * espalharem pelo banco — todo lugar que exibir a unidade sabe o que esperar.
 */
const UNIDADES = ['un', 'kg', 'g', 'l', 'ml'];

const nome = z
  .string({ required_error: 'Nome é obrigatório.', invalid_type_error: 'Nome inválido.' })
  .trim()
  .min(2, 'O nome deve ter ao menos 2 caracteres.')
  .max(60, 'O nome deve ter no máximo 60 caracteres.');

const unidade = z.enum(UNIDADES, {
  errorMap: () => ({ message: `Unidade inválida. Use uma de: ${UNIDADES.join(', ')}.` }),
});

const quantidadeNaoNegativa = (rotulo) =>
  z
    .number({
      required_error: `${rotulo} é obrigatório.`,
      invalid_type_error: `${rotulo} deve ser um número.`,
    })
    .min(0, `${rotulo} não pode ser negativo.`)
    .max(999999, `${rotulo} muito alto.`)
    .refine(temNoMaximoTresCasas, `${rotulo} aceita no máximo 3 casas decimais.`);

const criarInsumoSchema = z.object({
  nome,
  unidade,
  saldoAtual: quantidadeNaoNegativa('Saldo inicial').default(0),
  saldoMinimo: quantidadeNaoNegativa('Saldo mínimo').default(0),
});

const atualizarInsumoSchema = z
  .object({
    nome: nome.optional(),
    // A unidade não muda depois do cadastro: trocar "kg" por "g" sem converter o saldo e o
    // histórico deixaria o estoque errado. Errou a unidade? Remova o insumo e cadastre de novo.
    unidade: z
      .undefined({ invalid_type_error: 'A unidade não pode ser alterada depois do cadastro.' })
      .optional(),
    saldoMinimo: quantidadeNaoNegativa('Saldo mínimo').optional(),
    // saldoAtual NÃO entra aqui de propósito: toda mudança de saldo passa
    // por /movimentar, que sempre grava o histórico (MovimentacaoEstoque).
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'Envie ao menos um campo para atualizar.',
  });

/**
 * RF10 - movimentação de estoque.
 * "entrada"/"saida" são o dia a dia (reposição, quebra): informam a `quantidade` e o motivo é
 * opcional. "ajuste" é a correção de inventário: informa o `saldoContado` (o saldo que foi
 * contado, que pode ser menor ou maior que o do sistema) e exige o motivo, para a auditoria.
 */
const numeroOpcional = z
  .number({ invalid_type_error: 'Deve ser um número.' })
  .max(999999, 'Valor muito alto.')
  .refine(temNoMaximoTresCasas, 'Use no máximo 3 casas decimais.')
  .optional();

const movimentarEstoqueSchema = z
  .object({
    tipo: z.enum(['entrada', 'saida', 'ajuste'], {
      errorMap: () => ({ message: 'Tipo deve ser "entrada", "saida" ou "ajuste".' }),
    }),
    quantidade: numeroOpcional, // entrada e saída
    saldoContado: numeroOpcional, // ajuste
    motivo: z.string().trim().max(200, 'Motivo muito longo (máx. 200).').optional(),
  })
  .superRefine((d, ctx) => {
    const erro = (campo, message) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message });

    if (d.tipo === 'ajuste') {
      if (d.saldoContado === undefined) erro('saldoContado', 'Informe o saldo contado.');
      else if (d.saldoContado < 0) erro('saldoContado', 'O saldo contado não pode ser negativo.');
      if (d.quantidade !== undefined) {
        erro('quantidade', 'No ajuste, informe o saldo contado (saldoContado), não a quantidade.');
      }
      if (!d.motivo || d.motivo.length < 3) {
        erro('motivo', 'Informe o motivo do ajuste manual de estoque (mínimo 3 caracteres).');
      }
    } else {
      if (d.quantidade === undefined) erro('quantidade', 'Quantidade é obrigatória.');
      else if (d.quantidade <= 0) erro('quantidade', 'Quantidade deve ser maior que zero.');
      if (d.saldoContado !== undefined) erro('saldoContado', 'O saldo contado só vale para o tipo "ajuste".');
    }
  });

const listarInsumosQuery = z.object({
  ativo: z.enum(['true', 'false', 'todos']).default('true'),
});

module.exports = {
  UNIDADES,
  criarInsumoSchema,
  atualizarInsumoSchema,
  movimentarEstoqueSchema,
  listarInsumosQuery,
};
