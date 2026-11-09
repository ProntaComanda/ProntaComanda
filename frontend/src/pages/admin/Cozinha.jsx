import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import KDSBoard from '../../components/kds/KDSBoard';

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

  return (
    <AdminLayout>
      <h1 className="text-lg font-semibold">Cozinha e Bar</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Acompanhe e organize os pedidos em preparo em tempo real
      </p>

      <div className="mb-4 inline-flex rounded-md border border-neutral-200 p-1 dark:border-neutral-700">
        {SETORES.map((s) => (
          <button
            key={s.chave}
            onClick={() => setSetor(s.chave)}
            className={`rounded px-4 py-1.5 text-sm ${
              setor === s.chave
                ? 'bg-primary text-white'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* key: ao trocar de aba o quadro é recriado (filtro zerado, sala do socket trocada) */}
      <KDSBoard key={setor} setor={setor} />
    </AdminLayout>
  );
}
