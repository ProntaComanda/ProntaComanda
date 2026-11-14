/**
 * Quantidades de estoque têm no máximo 3 casas decimais (0,001). Somar e subtrair em ponto
 * flutuante deixa resto (0,1 + 0,2 = 0,30000000000000004 e 0,3 - 0,1 - 0,2 = 5,5e-17), e um
 * saldo "quase zero" nunca dispararia o alerta de ruptura (RF22), que compara com 0 exato.
 * Por isso todo saldo gravado passa por arredondarQuantidade().
 */
const CASAS = 3;
const FATOR = 10 ** CASAS;

const arredondarQuantidade = (n) => Math.round(n * FATOR) / FATOR;

// true se o número já está na precisão guardada (ex.: 0,25 e 1,5 sim; 0,0004 não)
const temNoMaximoTresCasas = (n) => Math.abs(n * FATOR - Math.round(n * FATOR)) < 1e-6;

/**
 * Resultado de uma movimentação sobre um saldo (mesma regra do front, em utils/estoque.js):
 * - entrada: soma | saída: tira (nunca abaixo de zero)
 * - ajuste: o saldo passa a ser o CONTADO (correção de inventário, para mais ou para menos)
 * Devolve o saldo antes e depois e a quantidade que fica no histórico (no ajuste, a diferença).
 */
function calcularMovimentacao({ tipo, quantidade, saldoContado }, saldoAtual) {
  const saldoAnterior = arredondarQuantidade(saldoAtual); // limpa resto de contas antigas
  if (tipo === 'ajuste') {
    return {
      saldoAnterior,
      novoSaldo: saldoContado,
      quantidadeRegistrada: arredondarQuantidade(Math.abs(saldoContado - saldoAnterior)),
    };
  }
  const delta = tipo === 'saida' ? -quantidade : quantidade;
  return {
    saldoAnterior,
    novoSaldo: Math.max(0, arredondarQuantidade(saldoAnterior + delta)),
    quantidadeRegistrada: quantidade,
  };
}

module.exports = { arredondarQuantidade, temNoMaximoTresCasas, calcularMovimentacao };
