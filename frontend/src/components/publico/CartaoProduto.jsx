import { Badge, Button, IconCart, Stepper } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';

// RF22 - produto esgotado aparece esmaecido, com selo, em vez de sumir.
// Clicar na foto ou no nome abre os detalhes; "Adicionar" coloca 1 no carrinho.
export default function CartaoProduto({ produto: p, quantidade, onAbrir, onAdicionar, onRemover }) {
  const indisponivel = p.disponivel === false;

  return (
    <article
      className={cn(
        'relative flex gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm',
        indisponivel && 'opacity-60'
      )}
    >
      <Badge tone={indisponivel ? 'danger' : 'ok'} className="absolute right-3 top-3">
        {indisponivel ? 'Indisponível' : 'Disponível'}
      </Badge>

      {/* coluna da foto: o preço fica logo abaixo dela, no canto esquerdo do card */}
      <div className="flex shrink-0 flex-col gap-2">
        <button
          type="button"
          onClick={onAbrir}
          aria-label={`Ver detalhes de ${p.nome}`}
          className="h-28 w-28 overflow-hidden rounded-md bg-muted"
        >
          {p.imagemUrl ? (
            <img src={p.imagemUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-ink-faint">Sem foto</span>
          )}
        </button>
        {/* h-8: mesma altura do botão "Adicionar", para o preço e o botão ficarem alinhados */}
        <p className="mt-auto flex h-8 items-center text-base font-bold tabular-nums">{dinheiro(p.preco)}</p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <button type="button" onClick={onAbrir} className="mt-5 text-left">
          <h3 className="font-display text-lg leading-tight">{p.nome}</h3>
        </button>
        {p.descricao && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{p.descricao}</p>}

        <div className="mt-auto flex items-end justify-end gap-2 pt-3">
          {!indisponivel &&
            (quantidade > 0 ? (
              <Stepper valor={quantidade} nome={p.nome} onDecrement={onRemover} onIncrement={onAdicionar} />
            ) : (
              <Button variant="solid" size="sm" onClick={onAdicionar} leftIcon={<IconCart className="h-4 w-4" />}>
                Adicionar
              </Button>
            ))}
        </div>
      </div>
    </article>
  );
}
