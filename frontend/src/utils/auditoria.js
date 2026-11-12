import { moeda } from './dinheiro';

// Nome legível de cada tipo gravado em LogAuditoria. Tipo novo que ainda não
// estiver aqui aparece com o nome cru, então nada some da tela.
const ROTULOS = {
  erro_sistema: 'Erro do sistema',
  estorno_item: 'Estorno de item',
  desconto_aplicado: 'Desconto aplicado',
  reabertura_comanda: 'Reabertura de comanda',
  reabertura_mesa: 'Reabertura de mesa',
  ajuste_estoque: 'Ajuste de estoque',
  funcionario_criado: 'Funcionário cadastrado',
  funcionario_atualizado: 'Funcionário atualizado',
  funcionario_desligado: 'Funcionário desligado',
  funcionario_reativado: 'Funcionário reativado',
  produto_preco_alterado: 'Preço alterado',
  produto_inativado: 'Produto removido',
  produto_reativado: 'Produto reativado',
};
export const rotuloAcao = (tipo) => ROTULOS[tipo] ?? tipo;

// Cor da pílula da ação: vermelho = erro; amarelo = mexe em dinheiro da conta (merece
// atenção do administrador); azul = estoque; o resto é neutro.
const TONS = {
  erro_sistema: 'danger',
  estorno_item: 'warning',
  desconto_aplicado: 'warning',
  reabertura_comanda: 'warning',
  reabertura_mesa: 'warning',
  ajuste_estoque: 'info',
};
export const tomAcao = (tipo) => TONS[tipo] ?? 'neutral';

const eId = (v) => typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);
const comanda = (numero) => `Comanda #${String(numero).padStart(3, '0')}`;

// Uma frase por registro, a partir do que cada módulo grava em `detalhes`.
export function resumirRegistro(tipo, d) {
  if (!d || !Object.keys(d).length) return '—'; // registro sem detalhes
  switch (tipo) {
    case 'estorno_item':
      return `${comanda(d.numero)}: ${d.item} (${moeda(d.valor)}). Motivo: ${d.motivo}`;
    case 'desconto_aplicado': {
      const desconto = d.tipo === 'percentual' ? `${d.valor}%` : moeda(d.valor);
      return `${comanda(d.numero)}: desconto de ${desconto}${d.observacao ? ` (${d.observacao})` : ''}`;
    }
    case 'reabertura_mesa':
      return `Mesa ${String(d.numero).padStart(2, '0')}: pagamento de ${moeda(d.valorEstornado)} estornado, ${
        d.comandasReabertas?.length ?? 0
      } comanda(s) reaberta(s)`;
    case 'ajuste_estoque':
      return `${d.insumo}: de ${d.de} para ${d.para}. Motivo: ${d.motivo}`;
    case 'produto_preco_alterado':
      return `${d.produto}: de ${moeda(d.de)} para ${moeda(d.para)}`;
    case 'produto_inativado':
    case 'produto_reativado':
      return d.produto;
    case 'funcionario_criado':
      return `${d.alvo} (${d.perfil})`;
    case 'funcionario_atualizado':
      return `${d.alvo}. Campos: ${(d.campos ?? []).join(', ')}`;
    case 'funcionario_desligado':
    case 'funcionario_reativado':
      return d.alvo;
    case 'erro_sistema':
      return d.mensagem;
    default:
      // tipo sem resumo próprio: mostra chave: valor, sem os ids que não ajudam a ler
      return Object.entries(d)
        .filter(([, v]) => !eId(v) && !Array.isArray(v))
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
  }
}
