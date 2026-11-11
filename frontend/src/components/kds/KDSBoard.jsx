import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosClient';
import { useAgora } from '../../hooks/useAgora';
import { useSocket } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { Button, EmptyState, IconBowl, Spinner } from '../ui';
import { pedidoCombinaComBusca, situacaoPedido } from '../../utils/kds';
import { mensagemErro } from '../../utils/erroApi';
import CardPedido from './CardPedido';
import KdsFiltros from './KdsFiltros';
import KdsResumo from './KdsResumo';

const ATUALIZACAO_DE_SEGURANCA_MS = 60000;

/**
 * RF05/RF06 - Fluxo Operacional KDS + SLA (semáforo)
 *
 * Recebe `setor` ('cozinha' | 'bar') de fora porque este mesmo quadro é usado em dois
 * lugares: dentro do admin (`pages/admin/Cozinha.jsx`, com sidebar e abas de setor) e na
 * tela standalone (`pages/kds/PainelKDS.jsx`, sem sidebar, setor conforme o perfil logado).
 * O cabeçalho de cada tela fica com a própria página; aqui ficam resumo, filtros e pedidos.
 */
export default function KDSBoard({ setor }) {
  const [pedidos, setPedidos] = useState(null); // null = primeira carga
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [avancando, setAvancando] = useState(() => new Set()); // comandas com o botão em andamento

  // Um relógio só para o quadro: alimenta o "Há 03:21" dos cards e também as contagens de
  // atrasados, que mudam com o tempo mesmo sem nenhum evento novo.
  const agora = useAgora(1000);
  const socketRef = useSocket([setor]);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/comandas/kds', { params: { setor } });
      setPedidos(data);
      setErro('');
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível atualizar os pedidos.'));
    }
  }, [setor]);

  useEffect(() => {
    carregar();
    // rede de segurança: se o socket cair sem avisar, a cozinha não fica olhando tela velha
    const id = setInterval(carregar, ATUALIZACAO_DE_SEGURANCA_MS);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;
    socket.on('kds:novo-item', carregar);
    socket.on('kds:status-atualizado', carregar);
    socket.on('connect', carregar); // voltou a conexão: busca o que pode ter sido perdido
    return () => {
      socket.off('kds:novo-item', carregar);
      socket.off('kds:status-atualizado', carregar);
      socket.off('connect', carregar);
    };
  }, [socketRef, carregar]);

  async function avancar(comandaId) {
    setAvancando((atual) => new Set(atual).add(comandaId));
    try {
      await api.patch(`/comandas/${comandaId}/avancar-status`, null, { params: { setor } });
    } catch (err) {
      // 409 = outra pessoa já avançou esse pedido: a recarga abaixo mostra como ele está agora
      toast.error('Não foi possível atualizar o pedido', mensagemErro(err, 'Tente de novo.'));
    } finally {
      await carregar();
      setAvancando((atual) => {
        const proximo = new Set(atual);
        proximo.delete(comandaId);
        return proximo;
      });
    }
  }

  // FIFO: o pedido mais antigo primeiro, que é o que a cozinha precisa tirar da frente.
  const todos = useMemo(
    () =>
      (pedidos ?? [])
        .map((pedido) => ({ pedido, ...situacaoPedido(pedido, agora) }))
        .sort((a, b) => new Date(a.pedido.lancadoEm) - new Date(b.pedido.lancadoEm)),
    [pedidos, agora]
  );

  const contagens = useMemo(() => {
    const total = { todos: todos.length, novo: 0, preparo: 0, pronto: 0, atrasado: 0 };
    todos.forEach((p) => {
      total[p.chave] += 1;
    });
    return total;
  }, [todos]);

  const visiveis = todos.filter(
    (p) => (filtro === 'todos' || p.chave === filtro) && pedidoCombinaComBusca(p.pedido, busca)
  );

  return (
    <div className="space-y-4">
      <KdsResumo contagens={contagens} />
      <KdsFiltros filtro={filtro} onFiltro={setFiltro} contagens={contagens} busca={busca} onBusca={setBusca} />

      {erro && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md bg-danger-soft px-4 py-2 text-sm text-danger-ink"
        >
          <span>{erro}</span>
          <Button variant="secondary" size="sm" onClick={carregar}>
            Tentar de novo
          </Button>
        </div>
      )}

      {pedidos === null ? (
        !erro && (
          <div className="flex justify-center py-16 text-ink-soft">
            <Spinner className="h-6 w-6" label="Carregando pedidos" />
          </div>
        )
      ) : visiveis.length === 0 ? (
        <EmptyState
          icon={<IconBowl className="h-10 w-10" />}
          title={todos.length === 0 ? 'Nenhum pedido por aqui agora' : 'Nenhum pedido encontrado'}
          description={
            todos.length === 0
              ? 'Os pedidos aparecem aqui assim que forem lançados.'
              : 'Tente outro filtro ou outra busca.'
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-4">
          {visiveis.map(({ pedido, chave, emAlerta }) => (
            <CardPedido
              key={pedido.comandaId}
              pedido={pedido}
              situacao={chave}
              emAlerta={emAlerta}
              agora={agora}
              ocupado={avancando.has(pedido.comandaId)}
              onAvancar={avancar}
            />
          ))}
        </div>
      )}
    </div>
  );
}
