// Cores por situação do pedido (design da Cozinha). As classes ficam escritas por extenso
// de propósito: o Tailwind só gera o CSS das classes que aparecem inteiras no código.
export const ESTILO_SITUACAO = {
  novo: {
    rotulo: 'Novo',
    borda: 'border-l-kds-novo',
    texto: 'text-kds-novo',
    botao: 'bg-kds-novo/80 hover:bg-kds-novo',
    topo: 'border-t-kds-novo',
    fundo: 'bg-kds-novo/15',
    chipAtivo: 'bg-kds-novo/20 text-ink',
    contagemAtiva: 'bg-kds-novo text-white',
  },
  preparo: {
    rotulo: 'Em preparo',
    borda: 'border-l-kds-preparo',
    texto: 'text-kds-preparo',
    botao: 'bg-kds-preparo/80 hover:bg-kds-preparo',
    topo: 'border-t-kds-preparo',
    fundo: 'bg-kds-preparo/15',
    chipAtivo: 'bg-kds-preparo/20 text-ink',
    contagemAtiva: 'bg-kds-preparo text-white',
  },
  pronto: {
    rotulo: 'Pronto',
    borda: 'border-l-kds-pronto',
    texto: 'text-kds-pronto',
    botao: 'bg-kds-pronto/80 hover:bg-kds-pronto',
    topo: 'border-t-kds-pronto',
    fundo: 'bg-kds-pronto/15',
    chipAtivo: 'bg-kds-pronto/20 text-ink',
    contagemAtiva: 'bg-kds-pronto text-white',
  },
  atrasado: {
    rotulo: 'Atrasado',
    borda: 'border-l-kds-atrasado',
    texto: 'text-kds-atrasado',
    botao: 'bg-kds-atrasado/80 hover:bg-kds-atrasado',
    topo: 'border-t-kds-atrasado',
    fundo: 'bg-kds-atrasado/15',
    chipAtivo: 'bg-kds-atrasado/20 text-ink',
    contagemAtiva: 'bg-kds-atrasado text-white',
  },
  // "Todos" não é uma situação de pedido: só dá cor ao total e ao filtro
  todos: {
    rotulo: 'Todos',
    topo: 'border-t-kds-total',
    fundo: 'bg-kds-total/15',
    texto: 'text-kds-total',
    chipAtivo: 'bg-kds-total/20 text-ink',
    contagemAtiva: 'bg-kds-total text-white',
  },
};

// O botão segue o passo do fluxo do backend (pendente -> em_preparo -> pronto -> entregue)
export const ROTULO_BOTAO = {
  pendente: 'Iniciar preparo',
  em_preparo: 'Marcar como pronto',
  pronto: 'Marcar como entregue',
};
