import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';
import CabecalhoGarcom from '../../components/garcom/CabecalhoGarcom';
import PedidosClientePendentes from '../../components/funcionarios/PedidosClientePendentes';
import MesaCard from '../../components/mesas/MesaCard';
import { Button, Chip, ConfirmDialog, EmptyState, IconClipboard, Spinner } from '../../components/ui';
import { useSocket } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { mensagemErro } from '../../utils/erroApi';

const FILTROS = [
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'livre', rotulo: 'Livres' },
  { chave: 'ocupada', rotulo: 'Abertas' },
  { chave: 'aguardando_fechamento', rotulo: 'Pediram a conta' },
];

// RF19/RF20 - Header contextual + seleção de mesa touch-friendly (mobile)
export default function MapaMesas() {
  const navigate = useNavigate();
  const [mesas, setMesas] = useState(null); // null = primeira carga
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [conectado, setConectado] = useState(false);
  const [aAbrir, setAAbrir] = useState(null); // mesa livre esperando a confirmação para abrir
  const [abrindo, setAbrindo] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/mesas');
      setMesas(data);
      setErro('');
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível carregar as mesas.'));
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // RF04 - mapa em tempo real: entra na sala 'mapa-mesas' e atualiza a mesa
  // específica quando o caixa fecha/reabre, ou outro garçom abre uma mesa.
  const socketRef = useSocket(['mapa-mesas']);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const aoConectar = () => {
      setConectado(true);
      carregar(); // voltou a conexão: busca o que pode ter sido perdido
    };
    const aoDesconectar = () => setConectado(false);
    const aoAtualizarMesa = (mesaAtualizada) =>
      setMesas((atual) => atual?.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m)) ?? atual);

    socket.on('connect', aoConectar);
    socket.on('disconnect', aoDesconectar);
    socket.on('mesa:atualizada', aoAtualizarMesa);
    setConectado(socket.connected);

    return () => {
      socket.off('connect', aoConectar);
      socket.off('disconnect', aoDesconectar);
      socket.off('mesa:atualizada', aoAtualizarMesa);
    };
  }, [socketRef, carregar]);

  // Mesa em uso: vai direto para a tela dela. Mesa livre: pede confirmação antes de abrir,
  // porque um toque sem querer deixaria a mesa ocupada com uma comanda vazia.
  const tocarMesa = (mesa) => {
    if (mesa.status === 'livre') setAAbrir(mesa);
    else navigate(`/funcionarios/mesa/${mesa._id}`);
  };

  const abrirMesa = async () => {
    setAbrindo(true);
    try {
      await api.post(`/mesas/${aAbrir._id}/abrir`);
      navigate(`/funcionarios/mesa/${aAbrir._id}`);
    } catch (err) {
      // 409: outra pessoa abriu a mesma mesa agora há pouco; a recarga mostra como ela está
      toast.error('Não foi possível abrir a mesa', mensagemErro(err, 'Tente de novo.'));
      carregar();
      setAbrindo(false);
      setAAbrir(null);
    }
  };

  const contagens = {
    todas: mesas?.length ?? 0,
    livre: mesas?.filter((m) => m.status === 'livre').length ?? 0,
    ocupada: mesas?.filter((m) => m.status === 'ocupada').length ?? 0,
    aguardando_fechamento: mesas?.filter((m) => m.status === 'aguardando_fechamento').length ?? 0,
  };
  const visiveis = (mesas ?? []).filter((m) => filtro === 'todas' || m.status === filtro);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <CabecalhoGarcom conectado={conectado} />

      <main className="mx-auto max-w-5xl px-4 py-5">
        {/* Autoatendimento: pedidos que clientes fizeram pelo QR code, aguardando confirmação */}
        <PedidosClientePendentes />

        <div className="mb-4">
          <h1 className="font-display text-2xl uppercase">Mesas</h1>
          <p className="text-sm text-ink-soft">Toque em uma mesa para ver a comanda ou abrir uma livre.</p>
        </div>

        {mesas !== null && mesas.length > 0 && (
          <div role="group" aria-label="Filtrar mesas" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {FILTROS.map(({ chave, rotulo }) => (
              <Chip
                key={chave}
                className="shrink-0"
                active={filtro === chave}
                count={contagens[chave]}
                onClick={() => setFiltro(chave)}
              >
                {rotulo}
              </Chip>
            ))}
          </div>
        )}

        {mesas === null ? (
          <div className="flex justify-center py-16 text-ink-soft">
            {erro ? (
              <div className="text-center">
                <p className="mb-3 text-sm text-danger-ink">{erro}</p>
                <Button variant="secondary" size="sm" onClick={carregar}>
                  Tentar de novo
                </Button>
              </div>
            ) : (
              <Spinner className="h-6 w-6" label="Carregando mesas" />
            )}
          </div>
        ) : mesas.length === 0 ? (
          <EmptyState
            icon={<IconClipboard className="h-10 w-10" />}
            title="Nenhuma mesa cadastrada ainda"
            description="Peça a um administrador para cadastrar as mesas do salão."
          />
        ) : visiveis.length === 0 ? (
          <EmptyState title="Nenhuma mesa nesta situação" description="Escolha outro filtro para ver as demais mesas." />
        ) : (
          <div className="grid grid-cols-2 gap-x-1 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visiveis.map((mesa) => (
              <MesaCard key={mesa._id} mesa={mesa} selecionada={false} onSelecionar={tocarMesa} />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(aAbrir)}
        title={`Abrir a mesa ${String(aAbrir?.numero ?? '').padStart(2, '0')}?`}
        message="A mesa passa a ficar ocupada e a primeira comanda é aberta."
        confirmLabel="Abrir mesa"
        tone="primary"
        loading={abrindo}
        onConfirm={abrirMesa}
        onCancel={() => setAAbrir(null)}
      />
    </div>
  );
}
