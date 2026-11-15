import { normalizar } from './texto';

// Número digitado na busca: "28", "28,", "28,5", "28.50"
const EH_NUMERO = /^\d+([.,]\d{0,2})?$/;
// "1.234" ou "1.234,5" (ponto de milhar): vira "1234" / "1234,5" para comparar com o preço
const COM_MILHAR = /^(\d{1,3}(?:\.\d{3})+)(,\d{0,2})?$/;

/**
 * Busca de produto (cardápio do cliente e gerenciamento). Digitou várias palavras? Todas
 * precisam combinar, em qualquer ordem: "bacon 32" acha o X-Bacon de R$ 32,00.
 * Cada palavra pode combinar com:
 *  - nome, descrição, ingredientes ou nome da categoria (sem diferenciar maiúscula nem acento)
 *  - preço: "28" acha 28,00 e 28,50 (e também 280,00: é busca pelo começo do valor);
 *    "28,5" acha 28,50; "R$ 32" e "32.00" também valem
 */
export function produtoCombinaComBusca(produto, busca, categoria = '') {
  const termos = normalizar(busca)
    .split(/\s+/)
    .map((t) => t.replace(/^r\$/, '')) // "R$32" e "R$" sozinho (que some)
    .filter(Boolean);
  if (termos.length === 0) return true;

  const texto = normalizar([produto.nome, produto.descricao, categoria, ...(produto.ingredientes ?? [])].join(' '));
  const [inteiro, centavos] = Number(produto.preco ?? 0).toFixed(2).split('.');

  return termos.every((termo) => {
    if (texto.includes(termo)) return true;

    const numero = termo.replace(COM_MILHAR, (_, a, b = '') => a.replace(/\./g, '') + b);
    if (!EH_NUMERO.test(numero)) return false;
    const procurado = numero.replace('.', ',');
    return procurado.includes(',') ? `${inteiro},${centavos}`.startsWith(procurado) : inteiro.startsWith(procurado);
  });
}
