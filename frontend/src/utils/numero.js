// 1248 -> "1.248"
export const inteiro = (valor) => new Intl.NumberFormat('pt-BR').format(valor ?? 0);

// 91.66 -> "91,7" (até 1 casa decimal, vírgula como no resto da tela)
export const decimal = (valor, casas = 1) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(valor ?? 0);

// "5,5" | "1.234,5" -> 5.5 | 1234.5 (vazio ou inválido -> NaN)
export { lerDinheiro as lerNumero } from './dinheiro';

// 5.5 -> "5,5" (valor inicial de um campo de texto)
export const numeroCampo = (valor) => String(valor ?? 0).replace('.', ',');
