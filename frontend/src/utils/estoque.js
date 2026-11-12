import { decimal } from './numero';

// Quantidades de insumo podem ser fracionadas (0,25 kg): mostra até 3 casas, sem zeros sobrando.
export const formatarQuantidade = (valor) => decimal(valor, 3);

/**
 * RF22 - situação de um insumo: zerado (vermelho), abaixo do mínimo (amarelo) ou em dia.
 * Insumo removido não entra nos alertas.
 */
export function situacaoInsumo(insumo) {
  if (!insumo.ativo) return 'removido';
  if (insumo.saldoAtual === 0) return 'zerado';
  if (insumo.saldoAtual < (insumo.saldoMinimo ?? 0)) return 'baixo';
  return 'ok';
}

/**
 * Saldo depois de uma movimentação, igual ao backend (controllers/estoque.controller.js):
 * "saída" tira; "entrada" e "ajuste" somam; nunca fica abaixo de zero.
 */
export function saldoDepois(tipo, saldoAtual, quantidade) {
  const delta = tipo === 'saida' ? -quantidade : quantidade;
  return Math.max(0, Math.round((saldoAtual + delta) * 1e6) / 1e6);
}
