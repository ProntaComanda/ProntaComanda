import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { IconX } from './Icons';

const TAMANHOS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
const FOCAVEIS =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal acessível: fecha com Esc e clique no fundo, trava o scroll da página,
 * mantém o foco dentro e devolve o foco ao elemento que abriu.
 * Para escolher qual elemento recebe o foco ao abrir, marque-o com `data-autofocus`.
 *
 * <Modal open={aberto} onClose={() => setAberto(false)} title="Novo funcionário"
 *        footer={<Button>Salvar funcionário</Button>}>...</Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  closeOnOverlay = true,
  hideClose = false,
  children,
}) {
  const painelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const tituloId = useId();
  const descId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const elementoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const painel = painelRef.current;
    const alvo = painel.querySelector('[data-autofocus]') ?? painel.querySelector(FOCAVEIS) ?? painel;
    alvo.focus();

    function aoTeclar(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const itens = [...painel.querySelectorAll(FOCAVEIS)];
      if (itens.length === 0) {
        e.preventDefault();
        painel.focus();
        return;
      }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/60 p-4"
      // mousedown (e não click): arrastar para fora de um campo de texto não fecha o modal
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? tituloId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'flex max-h-[90vh] w-full animate-pop-in flex-col rounded-lg bg-surface text-ink shadow-modal outline-none',
          TAMANHOS[size]
        )}
      >
        {(title || !hideClose) && (
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              {title && (
                <h2 id={tituloId} className="font-display text-lg leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-ink-soft">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={() => onCloseRef.current?.()}
                aria-label="Fechar"
                className="-mr-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
              >
                <IconX />
              </button>
            )}
          </header>
        )}

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
