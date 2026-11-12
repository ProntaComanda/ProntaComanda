import { useEffect, useState } from 'react';
import api from '../../api/axiosClient';
import { Badge, Button, EmptyState, Modal, Spinner } from '../ui';
import { formatarQuantidade } from '../../utils/estoque';
import { mensagemErro } from '../../utils/erroApi';

const TIPOS = {
  entrada: { rotulo: 'Entrada', tom: 'ok', sinal: '+' },
  saida: { rotulo: 'Saída', tom: 'warning', sinal: '\u2212' },
  ajuste: { rotulo: 'Ajuste', tom: 'info', sinal: '+' },
};

const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** RF10 - Histórico de movimentações de um insumo (as 200 mais recentes, da mais nova para a mais antiga). */
export default function HistoricoInsumoModal({ insumo, onFechar }) {
  const [movimentacoes, setMovimentacoes] = useState(null); // null = carregando
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .get(`/estoque/${insumo._id}/movimentacoes`)
      .then((r) => ativo && setMovimentacoes(r.data))
      .catch((err) => ativo && setErro(mensagemErro(err, 'Não foi possível carregar o histórico.')));
    return () => {
      ativo = false;
    };
  }, [insumo._id]);

  return (
    <Modal
      open
      onClose={onFechar}
      title="Histórico de movimentações"
      description={insumo.nome}
      size="lg"
      footer={<Button onClick={onFechar}>Fechar</Button>}
    >
      {erro ? (
        <p className="py-6 text-center text-sm text-danger-ink">{erro}</p>
      ) : movimentacoes === null ? (
        <div className="flex justify-center py-10 text-ink-soft">
          <Spinner className="h-6 w-6" label="Carregando histórico" />
        </div>
      ) : movimentacoes.length === 0 ? (
        <EmptyState
          title="Nenhuma movimentação ainda"
          description="Entradas, saídas e ajustes deste insumo aparecem aqui."
        />
      ) : (
        <ul className="max-h-96 divide-y divide-line overflow-y-auto pr-1">
          {movimentacoes.map((m) => {
            const tipo = TIPOS[m.tipo];
            return (
              <li key={m._id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Badge tone={tipo.tom}>{tipo.rotulo}</Badge>
                  <p className="mt-1 text-sm">
                    {m.motivo || <span className="text-ink-faint">Sem observação</span>}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {m.responsavel?.nome ?? 'Funcionário removido'} · {dataHora(m.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">
                  {tipo.sinal}
                  {formatarQuantidade(m.quantidade)} {insumo.unidade}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
