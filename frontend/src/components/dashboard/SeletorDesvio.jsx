import { cn } from '../../lib/cn';
import { TIPOS_DESVIO } from '../../utils/estatistica';

// Alterna o desvio padrão mostrado em todo o Dashboard: amostral (divide por n-1) ou populacional (divide por n).
export default function SeletorDesvio({ valor, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
      <span className="font-semibold uppercase tracking-wide">Desvio padrão</span>
      <div role="group" aria-label="Tipo de desvio padrão" className="inline-flex gap-1 rounded-lg border border-line bg-surface p-1">
        {TIPOS_DESVIO.map((t) => (
          <button
            key={t.valor}
            type="button"
            aria-pressed={valor === t.valor}
            onClick={() => onChange(t.valor)}
            className={cn(
              'h-7 rounded-md px-3 text-xs font-semibold transition',
              valor === t.valor ? 'bg-brand-gradient text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            )}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
