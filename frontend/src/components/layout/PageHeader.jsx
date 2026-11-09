import { IconHelp } from '../ui';

// Cabeçalho padrão das telas do desktop: título, subtítulo, divisor e "?" de ajuda.
// `acoes` recebe botões do lado direito; `onAjuda` mostra o botão "?".
export default function PageHeader({ titulo, descricao, acoes, onAjuda }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-4">
      <div>
        <h1 className="font-display text-2xl uppercase leading-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-ink-soft">{descricao}</p>}
      </div>
      {(acoes || onAjuda) && (
        <div className="flex shrink-0 items-center gap-2">
          {acoes}
          {onAjuda && (
            <button
              type="button"
              onClick={onAjuda}
              aria-label="Ajuda"
              title="Ajuda"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
            >
              <IconHelp />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
