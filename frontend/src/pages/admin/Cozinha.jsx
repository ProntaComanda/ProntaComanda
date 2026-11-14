import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import KDSBoard from '../../components/kds/KDSBoard';
import KdsAjudaModal from '../../components/kds/KdsAjudaModal';
import { cn } from '../../lib/cn';

const SETORES = [
  { chave: 'cozinha', label: 'Cozinha' },
  { chave: 'bar', label: 'Bar' },
];

// Visão do KDS dentro do admin (uso do Administrador para supervisionar).
// Uma única página com abas Cozinha | Bar: o admin alterna entre os dois
// setores sem mudar de rota. A tela operacional de verdade, usada pela
// equipe no dia a dia, é a standalone em pages/kds/PainelKDS.jsx.
export default function Cozinha() {
  const [setor, setSetor] = useState('cozinha');
  const [ajuda, setAjuda] = useState(false);

  return (
    // sidebarFechada: no KDS o menu fica sempre recolhido (mais área útil para a cozinha)
    <AdminLayout sidebarFechada>
      <PageHeader
        titulo={setor === 'bar' ? 'Bar' : 'Cozinha'}
        descricao="Acompanhe e organize os pedidos em preparo em tempo real"
        onAjuda={() => setAjuda(true)}
        acoes={
          <div role="group" aria-label="Setor" className="inline-flex gap-1 rounded-md bg-muted p-1">
            {SETORES.map((s) => (
              <button
                key={s.chave}
                type="button"
                aria-pressed={setor === s.chave}
                onClick={() => setSetor(s.chave)}
                className={cn(
                  'h-8 rounded px-4 text-xs font-semibold transition',
                  setor === s.chave ? 'bg-brand-gradient text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      {/* key: ao trocar de aba o quadro é recriado (filtro zerado, sala do socket trocada) */}
      <KDSBoard key={setor} setor={setor} />

      <KdsAjudaModal aberto={ajuda} onFechar={() => setAjuda(false)} />
    </AdminLayout>
  );
}
