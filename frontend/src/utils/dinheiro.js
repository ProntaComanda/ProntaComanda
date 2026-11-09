// 29.9 -> "R$ 29,90"
export const dinheiro = (valor) => `R$ ${Number(valor ?? 0).toFixed(2).replace('.', ',')}`;
