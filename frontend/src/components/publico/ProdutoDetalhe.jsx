import { useState } from 'react';
import { Badge, Button, IconArrowLeft, Stepper, Textarea } from '../ui';
import { dinheiro } from '../../utils/dinheiro';

const MAX_POR_ITEM = 20; // mesmo limite validado no servidor
const MAX_OBSERVACAO = 140;

/**
 * Detalhe do produto (cliente): foto, descrição, ingredientes, quantidade e
 * observação. Troque a `key` por produto para reiniciar o formulário.
 */
export default function ProdutoDetalhe({
  produto: p,
  quantidadeNoCarrinho,
  observacaoNoCarrinho,
  onVoltar,
  onConfirmar,
}) {
  const [quantidade, setQuantidade] = useState(Math.max(1, quantidadeNoCarrinho));
  const [observacao, setObservacao] = useState(observacaoNoCarrinho ?? '');
  const indisponivel = p.disponivel === false;
  const jaNoCarrinho = quantidadeNoCarrinho > 0;

  return (
    <div>
      <button
        type="button"
        onClick={onVoltar}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink"
      >
        <IconArrowLeft className="h-4 w-4" />
        Voltar para o cardápio
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {p.imagemUrl ? (
            <img src={p.imagemUrl} alt={p.nome} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-ink-faint">Sem foto</span>
          )}
        </div>

        <div className="flex flex-col">
          <Badge tone={indisponivel ? 'danger' : 'ok'} className="self-start">
            {indisponivel ? 'Indisponível' : 'Disponível'}
          </Badge>
          <h2 className="mt-3 font-display text-3xl leading-tight">{p.nome}</h2>
          <p className="mt-1 text-2xl font-semibold">{dinheiro(p.preco)}</p>
          {p.descricao && <p className="mt-3 text-ink-soft">{p.descricao}</p>}

          {p.ingredientes?.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ingredientes">
              {p.ingredientes.map((ingrediente) => (
                <li key={ingrediente} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-ink-soft">
                  {ingrediente}
                </li>
              ))}
            </ul>
          )}

          {indisponivel ? (
            <p className="mt-8 rounded-md bg-danger-soft p-3 text-sm text-danger-ink">
              Este item está indisponível no momento. Escolha outro no cardápio.
            </p>
          ) : (
            <>
              <div className="mt-8 flex items-center justify-between">
                <span className="text-sm font-semibold">Quantidade</span>
                <Stepper
                  valor={quantidade}
                  nome={p.nome}
                  onDecrement={() => setQuantidade((q) => Math.max(1, q - 1))}
                  onIncrement={() => setQuantidade((q) => Math.min(MAX_POR_ITEM, q + 1))}
                  decrementoDesabilitado={quantidade <= 1}
                  incrementoDesabilitado={quantidade >= MAX_POR_ITEM}
                />
              </div>

              <Textarea
                className="mt-6"
                label="Observações (opcional)"
                placeholder="Ex.: sem cebola, ponto da carne..."
                value={observacao}
                maxLength={MAX_OBSERVACAO}
                onChange={(e) => setObservacao(e.target.value)}
                hint={`${observacao.length}/${MAX_OBSERVACAO}`}
              />

              <Button
                variant="solid"
                size="lg"
                fullWidth
                className="mt-6"
                onClick={() => onConfirmar(quantidade, observacao.trim())}
              >
                {jaNoCarrinho ? 'Atualizar carrinho' : 'Adicionar ao carrinho'} · {dinheiro(p.preco * quantidade)}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
