import { useToastStore } from '../../store/toastStore';
import { cn } from '../../lib/cn';
import { IconAlert, IconCheck, IconInfo, IconX } from './Icons';

// Faixa lateral colorida, no mesmo estilo dos cards de pedido da Cozinha.
const TONS = {
  success: { faixa: 'border-l-ok', icone: 'text-ok', Icone: IconCheck },
  error: { faixa: 'border-l-danger', icone: 'text-danger', Icone: IconAlert },
  warning: { faixa: 'border-l-kds-preparo', icone: 'text-kds-preparo', Icone: IconAlert },
  info: { faixa: 'border-l-kds-novo', icone: 'text-kds-novo', Icone: IconInfo },
};

// Monte uma vez, em App.jsx. Mostra as mensagens criadas com toast.success(...) etc.
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const { faixa, icone, Icone } = TONS[t.tone] ?? TONS.info;
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-toast-in items-start gap-3 rounded-md border border-l-4 border-line bg-surface p-3 text-ink shadow-toast',
              faixa
            )}
          >
            <Icone className={cn('mt-0.5 h-5 w-5 shrink-0', icone)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.message && <p className="mt-0.5 text-sm text-ink-soft">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dispensar mensagem"
              className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-faint transition hover:bg-muted hover:text-ink"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
