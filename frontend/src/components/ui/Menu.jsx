import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { IconMore } from './Icons';

/**
 * Menu de ações do card (botão "⋮"). Fecha com Esc, clique fora ou ao escolher.
 * itens: [{ texto, onClick, perigo? }]
 */
export function Menu({ rotulo = 'Mais ações', itens, className }) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const botaoRef = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicarFora = (e) => {
      if (!raizRef.current?.contains(e.target)) setAberto(false);
    };
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={raizRef} className={cn('relative', className)}>
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        onClick={() => setAberto((a) => !a)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
      >
        <IconMore className="h-4 w-4" />
      </button>

      {aberto && (
        <ul
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-48 rounded-md border border-line bg-surface py-1 shadow-modal"
        >
          {itens.map(({ texto, onClick, perigo }) => (
            <li key={texto} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAberto(false);
                  onClick();
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm transition hover:bg-muted',
                  perigo ? 'text-danger-ink' : 'text-ink'
                )}
              >
                {texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
