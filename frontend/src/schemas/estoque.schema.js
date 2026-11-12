import { z } from 'zod';
import { lerNumero } from '../utils/numero';

export const UNIDADES = [
  { valor: 'un', rotulo: 'Unidade (un)' },
  { valor: 'kg', rotulo: 'Quilo (kg)' },
  { valor: 'g', rotulo: 'Grama (g)' },
  { valor: 'l', rotulo: 'Litro (l)' },
  { valor: 'ml', rotulo: 'Mililitro (ml)' },
];

// Número digitado como texto ("5" ou "5,5"). O formulário converte com lerNumero ao enviar.
const numero = (rotulo, { positivo = false } = {}) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .superRefine((valor, ctx) => {
      const n = lerNumero(valor);
      const problema = (message) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      if (!Number.isFinite(n)) return problema('Digite um número (ex.: 5 ou 5,5).');
      if (positivo ? n <= 0 : n < 0) return problema(positivo ? 'Deve ser maior que zero.' : 'Não pode ser negativo.');
      if (n > 999999) return problema('Valor muito alto (máximo de 999.999).');
      return undefined;
    });

/**
 * RF10 - validação do formulário de insumo (react-hook-form + zod). A validação "de verdade"
 * (nome repetido etc.) é do backend; aqui é só retorno rápido.
 * modo 'criar'  => pede o saldo inicial
 * modo 'editar' => o saldo só muda por movimentação (entrada, saída ou ajuste), então não pede
 */
export const insumoSchema = (modo) =>
  z.object({
    nome: z
      .string()
      .trim()
      .min(2, 'O nome deve ter ao menos 2 caracteres.')
      .max(60, 'O nome deve ter no máximo 60 caracteres.'),
    unidade: z.enum(
      UNIDADES.map((u) => u.valor),
      { errorMap: () => ({ message: 'Selecione a unidade.' }) }
    ),
    saldoAtual: modo === 'criar' ? numero('o saldo inicial') : z.string().optional(),
    saldoMinimo: numero('o saldo mínimo'),
  });

// Entrada e saída: observação opcional. Ajuste: o motivo é obrigatório (vai para a auditoria).
export const movimentacaoSchema = (tipo) =>
  z.object({
    quantidade: numero('a quantidade', { positivo: true }),
    motivo:
      tipo === 'ajuste'
        ? z
            .string()
            .trim()
            .min(3, 'Informe o motivo do ajuste (mínimo de 3 caracteres).')
            .max(200, 'Máximo de 200 caracteres.')
        : z.string().trim().max(200, 'Máximo de 200 caracteres.').optional(),
  });
