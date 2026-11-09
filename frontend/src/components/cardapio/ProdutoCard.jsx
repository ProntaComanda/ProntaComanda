import { useRef } from 'react';
import { Badge, Button, IconEdit, Menu } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';

const MAX_TAGS = 3;

// Card de produto do Cardápio (admin). RF22: esgotado aparece esmaecido, com selo.
// Só foto e textos ficam esmaecidos; os botões continuam com aparência normal.
export default function ProdutoCard({ produto: p, onEditar, onRemover, onDisponibilidade, onFoto }) {
  const inputFotoRef = useRef(null);
  const indisponivel = p.disponivel === false;
  const tags = p.ingredientes ?? [];
  const esmaecido = indisponivel && 'opacity-60';

  return (
    <article className="relative flex gap-4 rounded-lg border border-b-[3px] border-line border-b-primary bg-surface p-4 shadow-sm">
      <div className={cn('h-28 w-28 shrink-0 overflow-hidden rounded-md bg-muted', esmaecido)}>
        {p.imagemUrl ? (
          <img src={p.imagemUrl} alt={p.nome} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-ink-faint">Sem foto</span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={esmaecido}>
          <h3 className="mt-5 font-display text-lg leading-tight">{p.nome}</h3>
          {p.descricao && <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{p.descricao}</p>}
          <p className="mt-1 text-xs text-ink-faint">
            {p.setor === 'bar' ? 'Bar' : 'Cozinha'}
            {p.tempoPreparoMinutos ? ` · ${p.tempoPreparoMinutos} min` : ''}
          </p>
          {tags.length > 0 && (
            <ul aria-label="Ingredientes" className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, MAX_TAGS).map((t) => (
                <li key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                  {t}
                </li>
              ))}
              {tags.length > MAX_TAGS && (
                <li className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                  +{tags.length - MAX_TAGS}
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className={cn('text-base font-semibold', esmaecido)}>{dinheiro(p.preco)}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<IconEdit className="h-3.5 w-3.5" />}
              onClick={() => onEditar(p)}
            >
              Editar
            </Button>
            <Menu
              rotulo={`Mais ações para ${p.nome}`}
              itens={[
                {
                  texto: indisponivel ? 'Marcar como disponível' : 'Marcar como indisponível',
                  onClick: () => onDisponibilidade(p),
                },
                {
                  texto: p.imagemUrl ? 'Trocar foto' : 'Adicionar foto',
                  onClick: () => inputFotoRef.current?.click(),
                },
                { texto: 'Remover produto', onClick: () => onRemover(p), perigo: true },
              ]}
            />
          </div>
        </div>
      </div>

      <Badge tone={indisponivel ? 'danger' : 'ok'} className="absolute right-3 top-3">
        {indisponivel ? 'Indisponível' : 'Disponível'}
      </Badge>

      <input
        ref={inputFotoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={`Foto de ${p.nome}`}
        className="hidden"
        onChange={(e) => {
          onFoto(p, e.target.files[0]);
          e.target.value = ''; // permite escolher o mesmo arquivo de novo
        }}
      />
    </article>
  );
}
