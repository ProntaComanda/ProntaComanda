import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosClient';
import CarrinhoPedido from '../../components/garcom/CarrinhoPedido';
import ComandaConsumo from '../../components/garcom/ComandaConsumo';
import ObservacaoProdutoModal from '../../components/garcom/ObservacaoProdutoModal';
import ProdutoLinha from '../../components/garcom/ProdutoLinha';
import { Duracao } from '../../components/mesas/Cronometro';
import { ROTULO_STATUS_MESA, TOM_STATUS_MESA } from '../../components/mesas/MesaCard';
import {
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconArrowLeft,
  IconClock,
  IconSearch,
  Input,
  Spinner,
} from '../../components/ui';
import { useSocket } from '../../hooks/useSocket';
import { toast } from '../../store/toastStore';
import { mensagemErro } from '../../utils/erroApi';
import { normalizar } from '../../utils/texto';

const pad = (valor, tamanho) => String(valor).padStart(tamanho, '0');

// RF20/RF21/RF23/RF25/RF26 - Tela da mesa (mobile): cardápio, lançamento com
// carrinho, espelho de consumo da comanda selecionada, e solicitar fechamento.
export default function Mesa() {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const [mesa, setMesa] = useState(undefined); // undefined = carregando | null = não encontrada
  const [grupos, setGrupos] = useState([]); // cardápio: [{ _id, nome, produtos }]
  const [categoriaAtiva, setCategoriaAtiva] = useState('todos');
  const [busca, setBusca] = useState('');
  const [comandas, setComandas] = useState([]);
  const [comandaSelecionadaId, setComandaSelecionadaId] = useState(null);
  const [carrinho, setCarrinho] = useState([]); // [{ chave, produto, quantidade, observacao }]
  const [erroCarga, setErroCarga] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [abrindoComanda, setAbrindoComanda] = useState(false);
  const [produtoObs, setProdutoObs] = useState(null); // produto cujo modal de observação está aberto
  const [confirmandoFechamento, setConfirmandoFechamento] = useState(false);
  const [solicitando, setSolicitando] = useState(false);

  const carregarMesa = useCallback(async () => {
    try {
      const { data } = await api.get('/mesas');
      setMesa(data.find((m) => m._id === mesaId) ?? null);
      setErroCarga('');
    } catch (err) {
      setErroCarga(mensagemErro(err, 'Não foi possível carregar a mesa.'));
    }
  }, [mesaId]);

  const carregarComandas = useCallback(async () => {
    try {
      const { data } = await api.get(`/comandas/mesa/${mesaId}`);
      const abertas = data.filter((c) => c.status === 'aberta');
      setComandas(abertas);
      // mantém a seleção se ela ainda existir; senão, cai na primeira aberta
      setComandaSelecionadaId((atual) => (abertas.some((c) => c._id === atual) ? atual : (abertas[0]?._id ?? null)));
    } catch (err) {
      setErroCarga(mensagemErro(err, 'Não foi possível carregar as comandas.'));
    }
  }, [mesaId]);

  const carregarCardapio = useCallback(async () => {
    try {
      const { data } = await api.get('/cardapio');
      setGrupos(data);
    } catch (err) {
      setErroCarga(mensagemErro(err, 'Não foi possível carregar o cardápio.'));
    }
  }, []);

  const carregarTudo = useCallback(() => {
    carregarMesa();
    carregarComandas();
    carregarCardapio();
  }, [carregarMesa, carregarComandas, carregarCardapio]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  // RF22/RF23 - tempo real: status da mesa, disponibilidade de produto e andamento do KDS.
  // Entra na sala 'mapa-mesas' para saber quando o caixa fecha ou reabre esta mesa.
  const socketRef = useSocket(['mapa-mesas']);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return undefined;

    const aoAtualizarMesa = (mesaAtualizada) => {
      if (mesaAtualizada._id !== mesaId) return;
      setMesa(mesaAtualizada);
      carregarComandas();
    };
    const aoAtualizarProduto = (produtoAtualizado) =>
      setGrupos((atual) =>
        atual.map((g) => ({
          ...g,
          produtos: g.produtos.map((p) => (p._id === produtoAtualizado._id ? produtoAtualizado : p)),
        }))
      );

    socket.on('mesa:atualizada', aoAtualizarMesa);
    socket.on('produto:atualizado', aoAtualizarProduto);
    socket.on('kds:status-atualizado', carregarComandas);
    socket.on('connect', carregarTudo); // voltou a conexão: busca o que pode ter sido perdido
    return () => {
      socket.off('mesa:atualizada', aoAtualizarMesa);
      socket.off('produto:atualizado', aoAtualizarProduto);
      socket.off('kds:status-atualizado', carregarComandas);
      socket.off('connect', carregarTudo);
    };
  }, [socketRef, mesaId, carregarComandas, carregarTudo]);

  const comandaSelecionada = comandas.find((c) => c._id === comandaSelecionadaId) ?? null;
  const aguardandoFechamento = mesa?.status === 'aguardando_fechamento';
  const mesaFechada = mesa?.status === 'livre';

  // ---------- comandas ----------
  const abrirNovaComanda = async () => {
    setAbrindoComanda(true);
    try {
      const { data } = await api.post('/comandas/abrir', { mesaId });
      await carregarComandas();
      setComandaSelecionadaId(data.comanda._id);
    } catch (err) {
      toast.error('Não foi possível abrir a comanda', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setAbrindoComanda(false);
    }
  };

  // ---------- carrinho ----------
  const adicionarAoCarrinho = (produto, observacao = '', quantidade = 1) => {
    const chave = `${produto._id}::${observacao}`;
    setCarrinho((atual) => {
      const existente = atual.find((l) => l.chave === chave);
      if (existente) {
        return atual.map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + quantidade } : l));
      }
      return [...atual, { chave, produto, quantidade, observacao }];
    });
  };

  const alterarQuantidade = (chave, delta) =>
    setCarrinho((atual) =>
      atual
        .map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0)
    ); // chegou a 0: remove a linha

  const enviarCarrinho = async () => {
    if (!comandaSelecionada || !carrinho.length) return;
    const totalLinhas = carrinho.length;
    const totalItens = carrinho.reduce((n, l) => n + l.quantidade, 0);
    let enviadas = 0;
    setEnviando(true);
    try {
      for (const linha of carrinho) {
        // eslint-disable-next-line no-await-in-loop -- precisa manter a ordem do pedido
        await api.post(`/comandas/${comandaSelecionada._id}/itens`, {
          produtoId: linha.produto._id,
          quantidade: linha.quantidade,
          observacao: linha.observacao || undefined,
        });
        enviadas += 1;
        // Cada linha sai do carrinho assim que o servidor aceita: se a próxima falhar,
        // tentar de novo não lança em dobro o que já foi.
        setCarrinho((atual) => atual.filter((l) => l.chave !== linha.chave));
      }
      toast.success(
        'Pedido enviado',
        `Comanda #${pad(comandaSelecionada.numero, 3)} · ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`
      );
    } catch (err) {
      toast.error(
        enviadas > 0 ? `Só ${enviadas} de ${totalLinhas} itens foram enviados` : 'Não foi possível enviar o pedido',
        mensagemErro(err, 'Confira o pedido e tente de novo.')
      );
    } finally {
      setEnviando(false);
      carregarComandas();
    }
  };

  // ---------- fechamento ----------
  const solicitarFechamento = async () => {
    setSolicitando(true);
    try {
      await api.patch(`/mesas/${mesaId}/solicitar-fechamento`);
      toast.success('Fechamento solicitado', `Mesa ${pad(mesa.numero, 2)} · o caixa foi avisado`);
      navigate('/funcionarios');
    } catch (err) {
      toast.error('Não foi possível solicitar o fechamento', mensagemErro(err, 'Tente de novo.'));
      setSolicitando(false);
      setConfirmandoFechamento(false);
    }
  };

  // ---------- cardápio ----------
  const noPedido = useMemo(() => {
    const porProduto = {};
    carrinho.forEach((l) => {
      porProduto[l.produto._id] = (porProduto[l.produto._id] ?? 0) + l.quantidade;
    });
    return porProduto;
  }, [carrinho]);

  const termo = normalizar(busca).trim();
  const produtosExibidos = (
    categoriaAtiva === 'todos'
      ? grupos.flatMap((g) => g.produtos)
      : (grupos.find((g) => g._id === categoriaAtiva)?.produtos ?? [])
  ).filter((p) => !termo || normalizar(p.nome).includes(termo));

  const podeLancar = Boolean(comandaSelecionada) && !aguardandoFechamento;

  // ---------- tela ----------
  if (mesa === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink-soft">
        {erroCarga ? (
          <div className="text-center">
            <p className="mb-3 text-sm text-danger-ink">{erroCarga}</p>
            <Button variant="secondary" size="sm" onClick={carregarTudo}>
              Tentar de novo
            </Button>
          </div>
        ) : (
          <Spinner className="h-6 w-6" label="Carregando mesa" />
        )}
      </div>
    );
  }

  if (mesa === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">
        <EmptyState
          title="Mesa não encontrada"
          description="Ela pode ter sido removida. Volte ao mapa e escolha outra."
          action={
            <Button variant="strong" onClick={() => navigate('/funcionarios')}>
              Voltar ao mapa de mesas
            </Button>
          }
        />
      </div>
    );
  }

  // celular: tela cheia. No computador: coluna centralizada (largura máxima).
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => navigate('/funcionarios')}
            aria-label="Voltar para o mapa de mesas"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl uppercase leading-none">Mesa {pad(mesa.numero, 2)}</p>
            <Badge tone={TOM_STATUS_MESA[mesa.status]} className="mt-1.5">
              {ROTULO_STATUS_MESA[mesa.status]}
            </Badge>
          </div>
          {mesa.status !== 'livre' && mesa.abertaEm && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
              <IconClock className="h-4 w-4" />
              <Duracao desde={mesa.abertaEm} />
            </span>
          )}
        </div>
      </header>

      <main className={`mx-auto max-w-3xl space-y-4 px-3 py-4 ${carrinho.length > 0 ? 'pb-[55vh]' : 'pb-28'}`}>
        {erroCarga && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-md bg-danger-soft px-4 py-2 text-sm text-danger-ink"
          >
            <span>{erroCarga}</span>
            <Button variant="secondary" size="sm" onClick={carregarTudo}>
              Tentar de novo
            </Button>
          </div>
        )}

        {aguardandoFechamento && (
          <p className="rounded-md bg-warn-soft px-4 py-3 text-sm text-warn-ink">
            Esta mesa está aguardando o fechamento pelo caixa. Novos pedidos ficam bloqueados até lá.
          </p>
        )}
        {mesaFechada && (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-ink-soft">
            Esta mesa foi fechada. Volte ao mapa para abrir outra.
          </p>
        )}

        {/* RF25/RF23 - seleção de comanda; "+ Nova" nunca deixa a mesa sem destino para o
            carrinho, mesmo que todas as comandas tenham sido fechadas enquanto o garçom
            estava na tela. */}
        {!mesaFechada && (
          <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1">
            {comandas.map((c) => (
              <Chip
                key={c._id}
                className="shrink-0"
                active={c._id === comandaSelecionadaId}
                onClick={() => setComandaSelecionadaId(c._id)}
              >
                Comanda #{pad(c.numero, 3)}
              </Chip>
            ))}
            {!aguardandoFechamento && (
              <button
                type="button"
                onClick={abrirNovaComanda}
                disabled={abrindoComanda}
                className="inline-flex h-9 shrink-0 items-center rounded-full border border-dashed border-line px-4 text-sm font-medium text-ink-soft transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {abrindoComanda ? 'Abrindo...' : '+ Nova comanda'}
              </button>
            )}
          </div>
        )}

        {/* RF23 - espelho de consumo: itens já lançados, com a etapa de cada um */}
        {comandaSelecionada ? (
          <ComandaConsumo comanda={comandaSelecionada} />
        ) : (
          !mesaFechada && (
            <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-faint">
              Nenhuma comanda aberta nesta mesa. Toque em “+ Nova comanda” para começar.
            </p>
          )
        )}

        {/* cardápio */}
        <section aria-label="Cardápio" className="space-y-3">
          <Input
            type="search"
            leftIcon={<IconSearch className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no cardápio"
            aria-label="Buscar no cardápio"
          />

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            <Chip className="shrink-0" active={categoriaAtiva === 'todos'} onClick={() => setCategoriaAtiva('todos')}>
              Todos
            </Chip>
            {grupos.map((g) => (
              <Chip
                key={g._id}
                className="shrink-0"
                active={categoriaAtiva === g._id}
                onClick={() => setCategoriaAtiva(g._id)}
              >
                {g.nome}
              </Chip>
            ))}
          </div>

          {produtosExibidos.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-faint">
              {termo ? 'Nenhum produto encontrado.' : 'Nenhum produto nesta categoria.'}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {produtosExibidos.map((produto) => (
                <ProdutoLinha
                  key={produto._id}
                  produto={produto}
                  noPedido={noPedido[produto._id] ?? 0}
                  desabilitado={!podeLancar}
                  onAdicionar={() => adicionarAoCarrinho(produto)}
                  onObservacao={() => setProdutoObs(produto)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* RF20 - pedido em montagem fixo embaixo, sempre à mão no celular */}
      {carrinho.length > 0 && comandaSelecionada && (
        <CarrinhoPedido
          linhas={carrinho}
          numeroComanda={comandaSelecionada.numero}
          enviando={enviando}
          onAlterar={alterarQuantidade}
          onEnviar={enviarCarrinho}
        />
      )}

      {carrinho.length === 0 && podeLancar && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-3xl border-t border-line bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:border-x">
          <button
            type="button"
            onClick={() => setConfirmandoFechamento(true)}
            className="h-11 w-full rounded-md border border-danger text-sm font-semibold text-danger-ink transition hover:bg-danger-soft"
          >
            Solicitar fechamento da mesa
          </button>
        </div>
      )}

      {produtoObs && (
        <ObservacaoProdutoModal
          produto={produtoObs}
          onFechar={() => setProdutoObs(null)}
          onAdicionar={({ quantidade, observacao }) => {
            adicionarAoCarrinho(produtoObs, observacao, quantidade);
            setProdutoObs(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmandoFechamento}
        title="Solicitar o fechamento?"
        message="O caixa será avisado e esta mesa não aceita novos pedidos até o fechamento."
        confirmLabel="Solicitar fechamento"
        tone="primary"
        loading={solicitando}
        onConfirm={solicitarFechamento}
        onCancel={() => setConfirmandoFechamento(false)}
      />
    </div>
  );
}
