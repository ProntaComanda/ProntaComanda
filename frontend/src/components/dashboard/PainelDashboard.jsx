// Moldura de cada bloco do Dashboard (gráficos e listas): título em caixa alta + conteúdo.
export default function PainelDashboard({ titulo, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}
