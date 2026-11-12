// Regras do KDS (RF05/RF06) separadas da tela, para ficarem fáceis de testar.
import { normalizar } from './texto';

const LIMITE_PADRAO_MIN = 20; // sem tempo de preparo cadastrado nos itens
const ALERTA_PADRAO_MIN = 10;
const FRACAO_ALERTA = 0.7; // amarelo a partir de 70% do tempo esperado

export const FILTROS_KDS = ['todos', 'novo', 'preparo', 'pronto', 'atrasado'];

/**
 * Situação de um pedido do KDS num instante `agora` (ms).
 * - atrasado: passou do tempo esperado e ainda não ficou pronto. Atrasado tem prioridade
 *   sobre novo/em preparo, então as contagens dos filtros nunca se sobrepõem.
 * - emAlerta: já gastou 70% do tempo esperado (o tempo vira amarelo), mas ainda no prazo.
 * O tempo esperado é o maior tempo de preparo entre os itens (calculado no backend).
 */
export function situacaoPedido(pedido, agora) {
  const minutos = (agora - new Date(pedido.lancadoEm).getTime()) / 60000;
  const limite = pedido.tempoPreparoMinutos ?? LIMITE_PADRAO_MIN;
  const alerta = pedido.tempoPreparoMinutos ? pedido.tempoPreparoMinutos * FRACAO_ALERTA : ALERTA_PADRAO_MIN;

  if (pedido.statusGeral === 'pronto') return { chave: 'pronto', emAlerta: false };
  if (minutos > limite) return { chave: 'atrasado', emAlerta: false };
  return {
    chave: pedido.statusGeral === 'pendente' ? 'novo' : 'preparo',
    emAlerta: minutos > alerta,
  };
}

// Busca por número da comanda ("#001", "1"), mesa ("08", "mesa 8"), item ou observação.
export function pedidoCombinaComBusca(pedido, busca) {
  const termo = normalizar(busca).trim();
  if (!termo) return true;
  const mesa = String(pedido.mesa?.numero ?? '').padStart(2, '0');
  const palavras = [
    `#${String(pedido.numeroComanda).padStart(3, '0')}`,
    `mesa ${mesa}`,
    ...pedido.itens.flatMap((i) => [i.nomeProduto, i.observacao]),
  ];
  return normalizar(palavras.join(' | ')).includes(termo);
}
