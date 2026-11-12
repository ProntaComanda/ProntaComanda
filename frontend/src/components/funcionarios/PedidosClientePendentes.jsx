import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosClient';
import { useAgora } from '../../hooks/useAgora';
import { useSocket } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { Button, IconCart, IconCheck, IconClock, Input } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';
import { mensagemErro } from '../../utils/erroApi';

const ATUALIZACAO_DE_SEGURANCA_MS = 60000;

// Quanto o cliente já esperou sem resposta: a cor do tempo sobe de tom para o garçom priorizar.
const MIN_ATENCAO = 3;
const MIN_URGENTE = 5;

function haQuantoTempo(iso, agora) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  return { min, texto: min < 1 ? 'agora há pouco' : `há ${min} min` };
}

function PedidoCard({ pedido, agora, onAceitar, onRecusar }) {
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false); // aceitando ou recusando, com a chamada em andamento

  const total = pedido.itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0);
  const espera = haQuantoTempo(pedido.createdAt, agora);
  const corEspera =
    espera.min >= MIN_URGENTE
      ? 'text-danger-ink'
      : espera.min >= MIN_ATENCAO
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-ink-soft';

  async function executar(acao) {
    setOcupado(true);
    await acao(); // se der certo o card sai da fila; se falhar, volta a ficar disponível
    setOcupado(false);
  }

  return (
    <li className="flex animate-pop-in flex-col rounded-lg border border-line bg-muted p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl leading-none">
            Mesa {String(pedido.mesa?.numero ?? '?').padStart(2, '0')}
          </h3>
          {pedido.nomeCliente && <p className="mt-1 truncate text-sm text-ink-soft">{pedido.nomeCliente}</p>}
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-semibold', corEspera)}>
          <IconClock className="h-3.5 w-3.5" />
          {espera.texto}
        </span>
      </header>

      <ul className="my-3 flex-1 space-y-2 border-t border-line pt-3 text-sm">
        {pedido.itens.map((item, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr]">
            <span className="pt-0.5 text-xs tabular-nums text-ink-faint">{item.quantidade}x</span>
            <div>
              <p className="font-medium">{item.nomeProduto}</p>
              {item.observacao && <p className="text-xs text-ink-soft">• {item.observacao}</p>}
            </div>
          </li>
        ))}
      </ul>

      <p className="mb-3 flex items-baseline justify-between border-t border-line pt-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total</span>
        <span className="font-bold tabular-nums">{dinheiro(total)}</span>
      </p>

      {recusando ? (
        <div className="space-y-2">
          <Input
            autoFocus
            label="Motivo (opcional, o cliente vê)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={140}
            placeholder="Ex.: item em falta"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              loading={ocupado}
              onClick={() => executar(() => onRecusar(pedido, motivo.trim() || undefined))}
            >
              Confirmar recusa
            </Button>
            <Button
              variant="secondary"
              disabled={ocupado}
              onClick={() => {
                setRecusando(false);
                setMotivo('');
              }}
            >
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="solid"
            className="flex-1"
            leftIcon={<IconCheck className="h-4 w-4" />}
            loading={ocupado}
            onClick={() => executar(() => onAceitar(pedido))}
          >
            Aceitar
          </Button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setRecusando(true)}
            className="inline-flex h-10 items-center justify-center rounded-md border border-danger px-4 text-sm font-semibold text-danger-ink transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Autoatendimento (garçom): fila de pedidos que clientes fizeram pelo QR code.
 * Chega em tempo real (socket 'pedidos-cliente'). O garçom confere no salão e
 * toca em Aceitar (mesa ocupada + itens vão para cozinha/bar) ou Recusar.
 * Sem pedidos, a faixa some por completo.
 */
export default function PedidosClientePendentes() {
  const [pedidos, setPedidos] = useState([]);
  const agora = useAgora(15000); // "há 3 min" se mantém correto sem recarregar a lista
  const socketRef = useSocket(['pedidos-cliente']);

  const carregar = useCallback(() => {
    api
      .get('/pedidos-cliente')
      .then((r) => setPedidos(r.data))
      .catch(() => {}); // a fila só aparece quando há pedido: falhar aqui não deve poluir a tela
  }, []);

  useEffect(() => {
    carregar();
    // rede de segurança: se o socket cair sem avisar, o cliente não fica esperando à toa
    const id = setInterval(carregar, ATUALIZACAO_DE_SEGURANCA_MS);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const aoChegar = (pedido) => {
      setPedidos((atual) => (atual.some((p) => p._id === pedido._id) ? atual : [...atual, pedido]));
      navigator.vibrate?.(200);
    };
    const aoResolver = ({ _id }) => setPedidos((atual) => atual.filter((p) => p._id !== _id));

    socket.on('pedido-cliente:novo', aoChegar);
    socket.on('pedido-cliente:resolvido', aoResolver);
    // se a conexão caiu e voltou, busca de novo o que pode ter sido perdido
    socket.on('connect', carregar);

    return () => {
      socket.off('pedido-cliente:novo', aoChegar);
      socket.off('pedido-cliente:resolvido', aoResolver);
      socket.off('connect', carregar);
    };
  }, [socketRef, carregar]);

  // Devolve true se concluiu. O 409/404 significa que outro funcionário já tratou o pedido
  // (ou ele mudou): a recarga tira da fila o que não vale mais.
  async function resolver(pedido, acao, corpo) {
    try {
      await api.post(`/pedidos-cliente/${pedido._id}/${acao}`, corpo);
      setPedidos((atual) => atual.filter((p) => p._id !== pedido._id));
      return true;
    } catch (err) {
      toast.error('Não foi possível concluir o pedido', mensagemErro(err, 'Tente de novo.'));
      if (err.response?.status === 409 || err.response?.status === 404) carregar();
      return false;
    }
  }

  const aceitar = async (pedido) => {
    const concluiu = await resolver(pedido, 'aceitar');
    if (concluiu) {
      toast.success('Pedido aceito', `Mesa ${String(pedido.mesa?.numero ?? '?').padStart(2, '0')} · itens enviados ao preparo`);
    }
  };

  const recusar = async (pedido, motivo) => {
    const concluiu = await resolver(pedido, 'recusar', { motivo });
    if (concluiu) {
      toast.success('Pedido recusado', `Mesa ${String(pedido.mesa?.numero ?? '?').padStart(2, '0')}`);
    }
  };

  // o mais antigo primeiro: é quem está esperando há mais tempo
  const fila = useMemo(
    () => [...pedidos].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [pedidos]
  );

  if (fila.length === 0) return null;

  return (
    <section
      aria-live="polite"
      aria-label="Pedidos de clientes aguardando confirmação"
      className="mb-6 rounded-lg border border-l-4 border-line border-l-primary bg-surface p-4 shadow-sm"
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <IconCart className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
        </span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide">Pedidos de clientes</h2>
          <p className="text-xs text-ink-soft">
            {fila.length === 1 ? '1 pedido aguardando confirmação' : `${fila.length} pedidos aguardando confirmação`}
          </p>
        </div>
      </header>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
        {fila.map((pedido) => (
          <PedidoCard key={pedido._id} pedido={pedido} agora={agora} onAceitar={aceitar} onRecusar={recusar} />
        ))}
      </ul>
    </section>
  );
}
