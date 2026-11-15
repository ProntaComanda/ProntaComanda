import { useEffect } from 'react';

/**
 * Reserva o espaço da barra de rolagem da página (scrollbar-gutter: stable) enquanto `ativo`.
 * Sem isso, trocar um filtro ou uma categoria muda a altura da lista: a barra aparece ou some,
 * a página perde ou ganha uns 15 px de largura e tudo "pula" de lado (o que está alinhado à
 * direita ou ao centro). Com o espaço reservado a largura nunca muda.
 * Só vale para a tela que usa; ao sair, volta ao normal. Não é usado onde a tela tem altura
 * fixa (ex.: Mesas e Comandas), porque ali o espaço reservado apareceria como uma faixa vazia.
 */
export function useBarraDeRolagemFixa(ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined;
    const raiz = document.documentElement;
    const anterior = raiz.style.scrollbarGutter;
    raiz.style.scrollbarGutter = 'stable';
    return () => {
      raiz.style.scrollbarGutter = anterior;
    };
  }, [ativo]);
}
