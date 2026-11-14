import { decimal } from './numero';

// Guarda 3 casas, como o backend: 0,1 + 0,2 vira 0,3 e não 0,30000000000000004.
export const arredondar = (n) => Math.round(n * 1000) / 1000;

// Quantidades de insumo podem ser fracionadas (0,25 kg): mostra até 3 casas, sem zeros sobrando.
export const formatarQuantidade = (valor) => decimal(valor, 3);

/**
 * RF22 - situação de um insumo: zerado (vermelho), abaixo do mínimo (amarelo) ou em dia.
 * Insumo removido não entra nos alertas.
 */
export function situacaoInsumo(insumo) {
  if (!insumo.ativo) return 'removido';
  // saldos gravados antes do arredondamento do backend podem ter resto (5e-17): conta como zero
  const saldo = arredondar(insumo.saldoAtual);
  if (saldo === 0) return 'zerado';
  if (saldo < (insumo.saldoMinimo ?? 0)) return 'baixo';
  return 'ok';
}

/**
 * Saldo depois de uma movimentação, igual ao backend (backend/src/utils/quantidade.js):
 * - "entrada" soma e "saida" tira (nunca abaixo de zero), com o valor sendo a quantidade;
 * - "ajuste": o saldo passa a ser o CONTADO, o valor informado (para mais ou para menos).
 */
export function saldoDepois(tipo, saldoAtual, valor) {
  if (tipo === 'ajuste') return arredondar(valor);
  const delta = tipo === 'saida' ? -valor : valor;
  return Math.max(0, arredondar(saldoAtual + delta));
}
