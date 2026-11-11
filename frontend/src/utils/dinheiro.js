// 29.9 -> "R$ 29,90"
export const dinheiro = (valor) => `R$ ${Number(valor ?? 0).toFixed(2).replace('.', ',')}`;

// 29.9 -> "29,90" (valor de campo de texto, sem o "R$")
export const dinheiroCampo = (valor) => Number(valor ?? 0).toFixed(2).replace('.', ',');

// "29,90" | "29.90" | "R$ 1.234,56" -> número. Vazio ou inválido -> NaN.
// Com vírgula, ela é o decimal e os pontos são milhar.
export function lerDinheiro(texto) {
  const limpo = String(texto ?? '').replace(/[^\d,.-]/g, '');
  if (!limpo) return NaN;
  return Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo);
}

// 45280.9 -> "R$ 45.280,90" (com separador de milhar; para valores grandes, como no Dashboard)
export const moeda = (valor) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
