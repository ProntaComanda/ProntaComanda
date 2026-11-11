import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import PedidosClientePendentes from '../../components/funcionarios/PedidosClientePendentes';
import MesaCard from '../../components/mesas/MesaCard';
import MesaFormModal from '../../components/mesas/MesaFormModal';
import PainelMesa from '../../components/mesas/PainelMesa';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconClipboard,
  IconPlus,
  IconTrash,
  Modal,
  Spinner,
} from '../../components/ui';
import api from '../../api/axiosClient';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { mensagemErro } from '../../utils/erroApi';

const pad2 = (n) => String(n).padStart(2, '0');

const LEGENDA = [
  { cor: 'bg-ok', titulo: 'Verde: mesa livre', texto: 'Sem comanda aberta. Dá para abrir ou remover.' },
  { cor: 'bg-danger', titulo: 'Vermelha: mesa aberta', texto: 'Tem comanda em andamento. O cronômetro conta desde a abertura.' },
  { cor: 'bg-kds-preparo', titulo: 'Laranja: aguardando fechamento', texto: 'O garçom pediu a conta; falta o pagamento.' },
];

// RF04 - Mapa de Mesas Geral + painel da mesa (comandas, desconto e fechamento)
export default function MesasComandas() {
  const funcionario = useAuthStore((s) => s.funcionario);
  const administrador = funcionario?.perfil === 'administrador';

  const [mesas, setMesas] = useState(null); // null = carregando
  const [erro, setErro] = useState('');
  const [selecionadaId, setSelecionadaId] = useState(null);
  const [sinal, setSinal] = useState(0); // muda quando algo ao vivo pede para o painel recarregar
  const [modal, setModal] = useState(null); // { tipo: 'mesa' | 'remover' | 'ajuda', numero? }
  const [removendo, setRemovendo] = useState(false);

  // A mesa selecionada é derivada da lista: assim cada atualização ao vivo chega no painel sozinha.
  const mesaSelecionada = mesas?.find((m) => m._id === selecionadaId) ?? null;

  const selecionadaRef = useRef(null);
  selecionadaRef.current = selecionadaId;

  const carregarMesas = useCallback(async () => {
    try {
      const { data } = await api.get('/mesas');
      setMesas(data);
      setErro('');
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível carregar as mesas.'));
    }
  }, []);

  useEffect(() => {
    carregarMesas();
  }, [carregarMesas]);

  // Tempo real (RF04): o mapa muda sozinho; o painel recarrega quando a mesa aberta é afetada.
  const socketRef = useSocket(['mapa-mesas']);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const aoAtualizarMesa = (mesaAtualizada) => {
      setMesas((atual) => atual?.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m)) ?? atual);
      if (mesaAtualizada._id === selecionadaRef.current) setSinal((s) => s + 1);
    };
    const aoMudarItemNaCozinha = () => setSinal((s) => s + 1);
    // se a conexão caiu e voltou, busca de novo o que pode ter sido perdido
    const aoReconectar = () => {
      carregarMesas();
      setSinal((s) => s + 1);
    };

    socket.on('mesa:atualizada', aoAtualizarMesa);
    socket.on('kds:status-atualizado', aoMudarItemNaCozinha);
    socket.on('connect', aoReconectar);
    return () => {
      socket.off('mesa:atualizada', aoAtualizarMesa);
      socket.off('kds:status-atualizado', aoMudarItemNaCozinha);
      socket.off('connect', aoReconectar);
    };
  }, [socketRef, carregarMesas]);

  // O painel avisa quando a mesa mudou (abriu, fechou, reabriu): atualiza já, sem esperar o socket.
  const aoMesaMudar = useCallback(
    (mesaAtualizada) => {
      if (mesaAtualizada) {
        setMesas((atual) => atual?.map((m) => (m._id === mesaAtualizada._id ? mesaAtualizada : m)) ?? atual);
      }
      carregarMesas();
    },
    [carregarMesas]
  );

  const proximoNumero = mesas?.length ? Math.max(...mesas.map((m) => m.numero)) + 1 : 1;

  async function adicionarMesa(numero) {
    await api.post('/mesas', { numero });
    toast.success('Mesa adicionada', `Mesa ${pad2(numero)}`);
    setModal(null);
    await carregarMesas();
  }

  // RNF11 - "remover" é inativar; o backend só aceita com a mesa livre.
  async function removerMesa() {
    setRemovendo(true);
    try {
      await api.delete(`/mesas/${selecionadaId}`);
      toast.success('Mesa removida', `Mesa ${pad2(modal.numero)}`);
      setSelecionadaId(null);
      await carregarMesas();
    } catch (err) {
      toast.error('Não foi possível remover a mesa', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setRemovendo(false);
      setModal(null);
    }
  }

  const motivoSemRemover = !mesaSelecionada
    ? 'Selecione uma mesa para remover.'
    : mesaSelecionada.status !== 'livre'
      ? 'Só dá para remover uma mesa livre.'
      : undefined;

  const painel = mesaSelecionada ? (
    <PainelMesa
      key={mesaSelecionada._id}
      mesa={mesaSelecionada}
      sinal={sinal}
      podeDesconto={administrador}
      podeReabrir={administrador}
      onMesaMudou={aoMesaMudar}
    />
  ) : (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<IconClipboard className="h-8 w-8" />}
        title="Selecione uma mesa"
        description="Escolha uma mesa no mapa para ver as comandas e lançar pedidos."
      />
    </div>
  );

  return (
    <AdminLayout painel={painel}>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col">
        <PageHeader
          titulo="Mesas e Comandas"
          descricao="Acompanhe suas mesas e gerencie os pedidos em atendimento"
          onAjuda={() => setModal({ tipo: 'ajuda' })}
        />

        {/* Autoatendimento: pedidos de clientes aguardando aceite (mesma fila do garçom) */}
        <PedidosClientePendentes />

        {mesas === null ? (
          <div className="flex justify-center py-16 text-ink-soft">
            {erro ? (
              <div className="text-center">
                <p className="mb-3 text-sm text-danger-ink">{erro}</p>
                <Button variant="secondary" size="sm" onClick={carregarMesas}>
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
            title="Nenhuma mesa cadastrada"
            description={
              administrador
                ? 'Adicione as mesas do salão para começar a abrir comandas.'
                : 'Peça a um administrador para cadastrar as mesas do salão.'
            }
            action={
              administrador && (
                <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setModal({ tipo: 'mesa' })}>
                  Adicionar Mesa
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-1 gap-y-2">
            {mesas.map((mesa) => (
              <MesaCard
                key={mesa._id}
                mesa={mesa}
                selecionada={mesa._id === selecionadaId}
                onSelecionar={(m) => setSelecionadaId(m._id)}
              />
            ))}
          </div>
        )}

        {/* Cadastro do salão: só o administrador (o backend também barra os outros perfis) */}
        {administrador && mesas?.length > 0 && (
          <div className="mt-auto flex gap-2 pt-8">
            <Button
              variant="strong"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={() => setModal({ tipo: 'mesa' })}
            >
              Adicionar Mesa
            </Button>
            <Button
              variant="danger"
              leftIcon={<IconTrash className="h-4 w-4" />}
              disabled={Boolean(motivoSemRemover)}
              title={motivoSemRemover}
              onClick={() => setModal({ tipo: 'remover', numero: mesaSelecionada.numero })}
            >
              Remover
            </Button>
          </div>
        )}
      </div>

      {modal?.tipo === 'mesa' && (
        <MesaFormModal numeroSugerido={proximoNumero} onSalvar={adicionarMesa} onFechar={() => setModal(null)} />
      )}

      <ConfirmDialog
        open={modal?.tipo === 'remover'}
        title={`Remover a mesa ${pad2(modal?.numero ?? 0)}?`}
        message="A mesa sai do mapa. O histórico de comandas e pagamentos dela continua guardado."
        confirmLabel="Remover mesa"
        loading={removendo}
        onConfirm={removerMesa}
        onCancel={() => setModal(null)}
      />

      <Modal
        open={modal?.tipo === 'ajuda'}
        onClose={() => setModal(null)}
        title="Como ler o mapa de mesas"
        size="sm"
        footer={<Button onClick={() => setModal(null)}>Entendi</Button>}
      >
        <ul className="space-y-4">
          {LEGENDA.map(({ cor, titulo, texto }) => (
            <li key={titulo} className="flex gap-3">
              <span className={`mt-1 h-3 w-8 shrink-0 rounded-full ${cor}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{titulo}</p>
                <p className="text-sm text-ink-soft">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">
          Toque numa mesa para ver as comandas, lançar itens e fechar a conta. O mapa e o painel
          atualizam sozinhos quando outro funcionário mexe na mesma mesa.
        </p>
      </Modal>
    </AdminLayout>
  );
}
