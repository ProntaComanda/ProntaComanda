// Cálculos da comanda no front. Espelham calcularTotal() do backend
// (controllers/pagamento.controller.js): o backend é quem fecha a conta; aqui é
// só para mostrar o mesmo valor na tela antes de fechar.

export const arredondar = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

export const itensAtivos = (comanda) => comanda.itens.filter((i) => !i.estornado);

export function subtotalComanda(comanda) {
  return arredondar(itensAtivos(comanda).reduce((soma, i) => soma + i.precoUnitario * i.quantidade, 0));
}

function descontoBruto(comanda) {
  const subtotal = subtotalComanda(comanda);
  const { tipo, valor = 0 } = comanda.desconto ?? {};
  return tipo === 'percentual' ? subtotal * (valor / 100) : valor;
}

export const descontoComanda = (comanda) => arredondar(descontoBruto(comanda));

export function totalComanda(comanda) {
  return arredondar(subtotalComanda(comanda) - descontoBruto(comanda) + (comanda.taxaServico?.valor || 0));
}

export const ROTULO_STATUS_ITEM = {
  pendente: 'Aguardando',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Entregue',
};

/**
 * O backend guarda o desconto POR COMANDA, mas o design tem um desconto só para a
 * mesa. Para um desconto em R$, reparte o valor entre as comandas proporcionalmente
 * ao subtotal de cada uma (em centavos, para a soma fechar exata).
 * Devolve um valor em reais por comanda, na mesma ordem.
 */
export function repartirDesconto(comandas, valorTotal) {
  const subtotais = comandas.map((c) => Math.round(subtotalComanda(c) * 100));
  const somaSubtotais = subtotais.reduce((a, b) => a + b, 0);
  const alvo = Math.round(valorTotal * 100);
  if (somaSubtotais === 0) return comandas.map(() => 0);

  const partes = subtotais.map((s) => Math.floor((alvo * s) / somaSubtotais));
  let sobra = alvo - partes.reduce((a, b) => a + b, 0);
  for (let i = 0; sobra > 0 && i < partes.length; i += 1) {
    if (partes[i] < subtotais[i]) {
      partes[i] += 1;
      sobra -= 1;
    }
  }
  return partes.map((p) => p / 100);
}
