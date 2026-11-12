import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import HistoricoInsumoModal from '../../components/estoque/HistoricoInsumoModal';
import InsumoFormModal from '../../components/estoque/InsumoFormModal';
import MovimentarEstoqueModal from '../../components/estoque/MovimentarEstoqueModal';
import {
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconBox,
  IconMinus,
  IconPlus,
  IconSearch,
  Input,
  Menu,
  Spinner,
} from '../../components/ui';
import api from '../../api/axiosClient';
import { cn } from '../../lib/cn';
import { toast } from '../../store/toastStore';
import { formatarQuantidade, situacaoInsumo } from '../../utils/estoque';
import { mensagemErro } from '../../utils/erroApi';
import { normalizar } from '../../utils/texto';

const FILTROS = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'zerado', rotulo: 'Zerados' },
  { chave: 'baixo', rotulo: 'Abaixo do mínimo' },
  { chave: 'ok', rotulo: 'Em dia' },
];

const TITULO_MOVIMENTO = { entrada: 'Entrada registrada', saida: 'Saída registrada', ajuste: 'Ajuste registrado' };

// RF10 - Gestão e Entrada de Estoque
// RF22 - alerta visual: vermelho = zerado, amarelo = abaixo do mínimo
export default function Estoque() {
  const [insumos, setInsumos] = useState([]);
  const [mostrarRemovidos, setMostrarRemovidos] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  // null = fechado | {} = novo | insumo = editando
  const [formInsumo, setFormInsumo] = useState(null);
  const [movimento, setMovimento] = useState(null); // { insumo, tipo }
  const [historico, setHistorico] = useState(null); // insumo
  const [aRemover, setARemover] = useState(null);
  const [removendo, setRemovendo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/estoque', { params: { ativo: mostrarRemovidos ? 'todos' : 'true' } });
      setInsumos(data);
      setErroLista('');
    } catch (err) {
      setErroLista(mensagemErro(err, 'Não foi possível carregar o estoque.'));
    } finally {
      setCarregando(false);
    }
  }, [mostrarRemovidos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const comSituacao = useMemo(() => insumos.map((insumo) => ({ insumo, situacao: situacaoInsumo(insumo) })), [insumos]);

  // contadores só dos insumos ativos: o que foi removido não conta como alerta
  const contagens = useMemo(() => {
    const total = { todos: 0, zerado: 0, baixo: 0, ok: 0 };
    comSituacao.forEach(({ situacao }) => {
      if (situacao === 'removido') return;
      total.todos += 1;
      total[situacao] += 1;
    });
    return total;
  }, [comSituacao]);

  const termo = normalizar(busca).trim();
  const visiveis = comSituacao.filter(({ insumo, situacao }) => {
    if (termo && !normalizar(insumo.nome).includes(termo)) return false;
    if (situacao === 'removido') return filtro === 'todos'; // removidos só aparecem em "Todos"
    return filtro === 'todos' || filtro === situacao;
  });

  const remover = async () => {
    const insumo = aRemover;
    setRemovendo(true);
    try {
      await api.delete(`/estoque/${insumo._id}`);
      toast.success('Insumo removido', insumo.nome);
      carregar();
    } catch (err) {
      toast.error('Não foi possível remover o insumo', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setRemovendo(false);
      setARemover(null);
    }
  };

  const reativar = async (insumo) => {
    try {
      await api.patch(`/estoque/${insumo._id}/reativar`);
      toast.success('Insumo reativado', insumo.nome);
      carregar();
    } catch (err) {
      toast.error('Não foi possível reativar o insumo', mensagemErro(err, 'Tente de novo.'));
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        titulo="Estoque"
        descricao="Controle o saldo de insumos e registre entradas, saídas e ajustes"
        acoes={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setFormInsumo({})}>
            Adicionar insumo
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrar insumos" className="flex flex-wrap items-center gap-2">
          {FILTROS.map(({ chave, rotulo }) => (
            <Chip key={chave} active={filtro === chave} count={contagens[chave]} onClick={() => setFiltro(chave)}>
              {rotulo}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={mostrarRemovidos}
              onChange={(e) => setMostrarRemovidos(e.target.checked)}
              className="h-4 w-4 accent-[#f36115]"
            />
            Mostrar removidos
          </label>
          <Input
            className="sm:w-64"
            leftIcon={<IconSearch className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar insumo..."
            aria-label="Buscar insumo pelo nome"
          />
        </div>
      </div>

      {carregando ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner label="Carregando" /> Carregando estoque...
        </p>
      ) : erroLista ? (
        <EmptyState
          title="Não foi possível carregar"
          description={erroLista}
          action={
            <Button variant="strong" onClick={carregar}>
              Tentar de novo
            </Button>
          }
        />
      ) : insumos.length === 0 ? (
        <EmptyState
          icon={<IconBox className="h-10 w-10" />}
          title="Nenhum insumo cadastrado"
          description="Cadastre os ingredientes e materiais para acompanhar o saldo e receber alertas de reposição."
          action={
            <Button variant="strong" onClick={() => setFormInsumo({})}>
              Adicionar insumo
            </Button>
          }
        />
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={<IconSearch className="h-10 w-10" />}
          title="Nenhum insumo encontrado"
          description="Tente outro filtro ou outra busca."
        />
      ) : (
        // overflow visível no desktop: o menu "⋮" da última linha não pode ser cortado
        <div className="overflow-x-auto rounded-lg border border-line bg-surface lg:overflow-visible">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Insumos em estoque</caption>
            <thead className="bg-tile text-xs font-semibold uppercase tracking-wide text-ink-soft [&_th:first-child]:rounded-tl-lg [&_th:last-child]:rounded-tr-lg">
              <tr>
                <th scope="col" className="px-4 py-3">Insumo</th>
                <th scope="col" className="px-4 py-3">Saldo atual</th>
                <th scope="col" className="px-4 py-3">Saldo mínimo</th>
                <th scope="col" className="px-4 py-3 text-right">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visiveis.map(({ insumo, situacao }) => {
                const removido = situacao === 'removido';
                return (
                  <tr key={insumo._id} className="transition hover:bg-muted">
                    <td className={cn('px-4 py-3 font-semibold', removido && 'text-ink-faint')}>
                      {insumo.nome}
                      {removido && (
                        <Badge tone="neutral" dot={false} className="ml-2 align-middle">
                          Removido
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          situacao === 'zerado' && 'text-danger-ink',
                          situacao === 'baixo' && 'text-warn-ink',
                          removido && 'font-normal text-ink-faint'
                        )}
                      >
                        {formatarQuantidade(insumo.saldoAtual)} {insumo.unidade}
                      </span>
                      {situacao === 'zerado' && (
                        <Badge tone="danger" className="ml-2 align-middle">
                          Zerado
                        </Badge>
                      )}
                      {situacao === 'baixo' && (
                        <Badge tone="warning" className="ml-2 align-middle">
                          Abaixo do mínimo
                        </Badge>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 tabular-nums', removido ? 'text-ink-faint' : 'text-ink-soft')}>
                      {insumo.saldoMinimo > 0 ? `${formatarQuantidade(insumo.saldoMinimo)} ${insumo.unidade}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {removido ? (
                          <>
                            <Button variant="secondary" size="sm" onClick={() => reativar(insumo)}>
                              Reativar
                            </Button>
                            <Menu
                              rotulo={`Mais ações de ${insumo.nome}`}
                              itens={[{ texto: 'Ver histórico', onClick: () => setHistorico(insumo) }]}
                            />
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<IconPlus className="h-3.5 w-3.5" />}
                              onClick={() => setMovimento({ insumo, tipo: 'entrada' })}
                            >
                              Entrada
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<IconMinus className="h-3.5 w-3.5" />}
                              onClick={() => setMovimento({ insumo, tipo: 'saida' })}
                            >
                              Saída
                            </Button>
                            <Menu
                              rotulo={`Mais ações de ${insumo.nome}`}
                              itens={[
                                { texto: 'Ajuste de saldo', onClick: () => setMovimento({ insumo, tipo: 'ajuste' }) },
                                { texto: 'Ver histórico', onClick: () => setHistorico(insumo) },
                                { texto: 'Editar insumo', onClick: () => setFormInsumo(insumo) },
                                { texto: 'Remover insumo', perigo: true, onClick: () => setARemover(insumo) },
                              ]}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formInsumo && (
        <InsumoFormModal
          insumo={formInsumo}
          onFechar={() => setFormInsumo(null)}
          onSalvo={(nome) => {
            toast.success(formInsumo._id ? 'Insumo atualizado' : 'Insumo adicionado', nome);
            setFormInsumo(null);
            carregar();
          }}
        />
      )}

      {movimento && (
        <MovimentarEstoqueModal
          insumo={movimento.insumo}
          tipo={movimento.tipo}
          onFechar={() => setMovimento(null)}
          onSalvo={(atualizado) => {
            toast.success(
              TITULO_MOVIMENTO[movimento.tipo],
              `${atualizado.nome} · saldo: ${formatarQuantidade(atualizado.saldoAtual)} ${atualizado.unidade}`
            );
            setMovimento(null);
            carregar();
          }}
        />
      )}

      {historico && <HistoricoInsumoModal insumo={historico} onFechar={() => setHistorico(null)} />}

      <ConfirmDialog
        open={Boolean(aRemover)}
        title={`Remover ${aRemover?.nome ?? ''}?`}
        message="O insumo sai da lista, mas o histórico de movimentações é mantido. Você pode reativá-lo depois em “Mostrar removidos”."
        confirmLabel="Remover insumo"
        loading={removendo}
        onConfirm={remover}
        onCancel={() => setARemover(null)}
      />
    </AdminLayout>
  );
}
