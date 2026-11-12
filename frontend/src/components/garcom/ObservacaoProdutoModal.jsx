import { useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import { Button, Chip, Modal, Stepper, Textarea } from '../ui';
import { dinheiro } from '../../utils/dinheiro';

const QUANTIDADE_MAXIMA = 99;

/**
 * RF21 - quantidade e observação de um produto, com as observações mais usadas dele como
 * atalho de um toque. Substitui o antigo `window.prompt`. Monte só quando for abrir.
 * `onAdicionar({ quantidade, observacao })`
 */
export default function ObservacaoProdutoModal({ produto, onAdicionar, onFechar }) {
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [sugestoes, setSugestoes] = useState(null); // null = carregando

  useEffect(() => {
    let ativo = true;
    api
      .get(`/comandas/produtos/${produto._id}/sugestoes`)
      .then((r) => ativo && setSugestoes(r.data))
      .catch(() => ativo && setSugestoes([])); // sugestão é só atalho: o campo de texto continua valendo
    return () => {
      ativo = false;
    };
  }, [produto._id]);

  return (
    <Modal
      open
      onClose={onFechar}
      title={produto.nome}
      description={dinheiro(produto.preco)}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={() => onAdicionar({ quantidade, observacao: observacao.trim() })}>
            Adicionar · {dinheiro(produto.preco * quantidade)}
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Quantidade</span>
        <Stepper
          grande
          nome={produto.nome}
          valor={quantidade}
          onDecrement={() => setQuantidade((q) => Math.max(1, q - 1))}
          onIncrement={() => setQuantidade((q) => Math.min(QUANTIDADE_MAXIMA, q + 1))}
          decrementoDesabilitado={quantidade <= 1}
          incrementoDesabilitado={quantidade >= QUANTIDADE_MAXIMA}
        />
      </div>

      <div className="mt-4">
        <Textarea
          data-autofocus
          label="Observação (opcional)"
          rows={2}
          maxLength={120}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: Ao ponto, sem cebola"
        />
      </div>

      {sugestoes === null ? (
        <p className="mt-3 text-xs text-ink-faint">Carregando sugestões...</p>
      ) : (
        sugestoes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Observações mais usadas">
            {sugestoes.map((texto) => (
              <Chip key={texto} active={observacao === texto} onClick={() => setObservacao(texto)}>
                {texto}
              </Chip>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}
