import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosClient';
import { agruparItens } from '../../utils/agruparItens';
import { dinheiro } from '../../utils/dinheiro';
import { Badge, Button, ConfirmDialog, IconCart, Input, Modal, Stepper } from '../ui';
import { cn } from '../../lib/cn';

const CHAVE_PEDIDOS = 'pc_pedidos'; // ids dos pedidos deste celular (localStorage)
const CHAVE_MESA = 'pc_mesa'; // última mesa escolhida (sessionStorage)
const CHAVE_NOME = 'pc_nome'; // último nome digitado (sessionStorage)
const INTERVALO_ATIVO_MS = 5000; // enquanto algo está mudando (pedido novo, cozinha preparando)
const INTERVALO_CALMO_MS = 15000; // tudo entregue: só espera o pagamento para limpar a tela
const VALIDADE_MS = 12 * 60 * 60 * 1000; // pedidos antigos saem da lista depois de 12 h
const MAX_ACOMPANHADOS = 10; // o servidor aceita até 10 ids por consulta

// O armazenamento do navegador pode estar bloqueado (aba anônima, por exemplo).
// Nesses casos o painel funciona igual, só não "lembra" depois de recarregar.
function ler(armazenamento, chave) {
  try {
    return window[armazenamento].getItem(chave) ?? '';
  } catch {
    return '';
  }
}
function gravar(armazenamento, chave, valor) {
  try {
    if (valor) window[armazenamento].setItem(chave, valor);
    else window[armazenamento].removeItem(chave);
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}
function carregarAcompanhados() {
  try {
    const lista = JSON.parse(ler('localStorage', CHAVE_PEDIDOS)) || [];
    return lista
      .filter((p) => p?.id && Date.now() - p.criadoEm < VALIDADE_MS)
      .slice(-MAX_ACOMPANHADOS);
  } catch {
    return [];
  }
}

const SITUACOES_EM_ANDAMENTO = ['na_fila', 'preparando', 'pronto'];

const ROTULO_SITUACAO = {
  aguardando: { texto: 'Aguardando garçom', classe: 'bg-warn-soft text-warn-ink' },
  na_fila: { texto: 'Na fila', classe: 'bg-muted text-ink-soft' },
  preparando: { texto: 'Preparando', classe: 'bg-info-soft text-info-ink' },
  pronto: { texto: 'Pronto', classe: 'bg-ok-soft text-ok-ink' },
  entregue: { texto: 'Entregue', classe: 'bg-ok text-white' },
  cancelado: { texto: 'Cancelado', classe: 'bg-danger-soft text-danger-ink' },
  recusado: { texto: 'Recusado', classe: 'bg-danger-soft text-danger-ink' },
};

/**
 * Autoatendimento (cliente): carrinho + escolha da mesa + envio + acompanhamento.
 *
 * O pedido NÃO vai direto para a cozinha: fica "aguardando garçom" até ele
 * conferir no salão e aceitar (ou recusar, com motivo). Depois de aceito, o
 * cliente passa a ver a COMANDA DA MESA (a mesma para todos que dividem a mesa),
 * com o andamento de cada item, o total da mesa e o que ele próprio pediu.
 * Quando o caixa recebe o pagamento, a comanda some da tela dele sozinha.
 *
 * `itens` é a lista do carrinho ([{ produto, quantidade, observacao }]);
 * quem guarda o carrinho é a página do cardápio.
 */
export default function PainelPedido({
  itens,
  onAlterarQuantidade,
  onObservacao,
  onPedidoEnviado,
  onLimparCarrinho,
}) {
  const [aberto, setAberto] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [acompanhados, setAcompanhados] = useState(carregarAcompanhados); // [{ id, criadoEm }]
  const [dados, setDados] = useState({}); // id do pedido -> visão devolvida pelo servidor
  const [contas, setContas] = useState([]); // comandas das mesas em que o cliente tem pedido aceito
  const [contaEncerrada, setContaEncerrada] = useState(false);
  const [mesas, setMesas] = useState([]);
  const [mesaId, setMesaId] = useState(() => ler('sessionStorage', CHAVE_MESA));
  const [nomeCliente, setNomeCliente] = useState(() => ler('sessionStorage', CHAVE_NOME));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const qtdTotal = useMemo(() => itens.reduce((s, i) => s + i.quantidade, 0), [itens]);
  const valorCarrinho = useMemo(
    () => itens.reduce((s, i) => s + i.quantidade * (i.produto.preco ?? 0), 0),
    [itens]
  );

  // guarda a lista de pedidos para sobreviver a um F5 ou a fechar o navegador
  useEffect(() => {
    gravar('localStorage', CHAVE_PEDIDOS, acompanhados.length ? JSON.stringify(acompanhados) : '');
  }, [acompanhados]);

  const idsConsulta = acompanhados.map((p) => p.id).join(',');

  const atualizar = useCallback(async () => {
    if (!idsConsulta) return;
    try {
      const { data } = await api.get('/publico/acompanhamento', { params: { ids: idsConsulta } });
      setDados((atual) => ({ ...atual, ...Object.fromEntries(data.pedidos.map((p) => [p._id, p])) }));
      setContas(data.mesas);

      // Sai da lista: pedido que o servidor não conhece mais (ex.: banco recriado) e
      // pedido ENCERRADO (a conta foi paga no caixa). Só considera os ids que foram
      // consultados, para não apagar um pedido enviado enquanto esta resposta vinha.
      const consultados = new Set(idsConsulta.split(','));
      const devolvidos = new Set(data.pedidos.map((p) => p._id));
      const encerrados = new Set(data.pedidos.filter((p) => p.encerrado).map((p) => p._id));
      setAcompanhados((atual) => {
        const filtrada = atual.filter(
          (p) => !consultados.has(p.id) || (devolvidos.has(p.id) && !encerrados.has(p.id))
        );
        return filtrada.length === atual.length ? atual : filtrada;
      });
      if (encerrados.size) setContaEncerrada(true);
    } catch {
      /* sem rede agora: mantém o que já está na tela e tenta de novo depois */
    }
  }, [idsConsulta]);

  // consulta ao abrir a página e sempre que a lista de pedidos muda
  useEffect(() => {
    atualizar();
  }, [atualizar]);

  const haAlgoAtivo = acompanhados.some((p) => dados[p.id]?.status !== 'recusado');
  const algoMudando = useMemo(() => {
    const aguardando = acompanhados.some((p) => {
      const d = dados[p.id];
      return !d || d.status === 'pendente';
    });
    const naCozinha = contas.some((c) =>
      c.comandas.some((cm) => cm.itens.some((i) => SITUACOES_EM_ANDAMENTO.includes(i.situacao)))
    );
    return aguardando || naCozinha;
  }, [acompanhados, dados, contas]);

  // consulta de tempos em tempos: rápido enquanto algo muda; mais devagar depois (só
  // para perceber o pagamento e limpar a tela)
  useEffect(() => {
    if (!haAlgoAtivo) return;
    const id = setInterval(atualizar, algoMudando ? INTERVALO_ATIVO_MS : INTERVALO_CALMO_MS);
    return () => clearInterval(id);
  }, [haAlgoAtivo, algoMudando, atualizar]);

  // lista de mesas: carrega quando o painel abre com itens no carrinho
  useEffect(() => {
    if (!aberto || !itens.length) return;
    api
      .get('/publico/mesas')
      .then((r) => setMesas(r.data))
      .catch(() => setErro('Não foi possível carregar as mesas. Tente novamente.'));
  }, [aberto, itens.length]);

  // pedidos que ainda precisam de atenção: aguardando o garçom ou recusados
  // (os aceitos viram a comanda da mesa, mais abaixo)
  const pedidosEmAberto = useMemo(
    () =>
      acompanhados
        .map((p) => dados[p.id])
        .filter((d) => d && d.status !== 'aceito')
        .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)),
    [acompanhados, dados]
  );
  const haPendente = pedidosEmAberto.some((p) => p.status === 'pendente');
  const conta = contas[0] ?? null; // normalmente o cliente está em uma mesa só

  const escolherMesa = (id) => {
    setMesaId(id);
    gravar('sessionStorage', CHAVE_MESA, id);
  };

  const enviar = async () => {
    if (!mesaId) {
      setErro('Escolha a sua mesa antes de enviar.');
      return;
    }
    setEnviando(true);
    setErro('');
    try {
      const { data } = await api.post('/publico/pedidos', {
        mesaId,
        nomeCliente: nomeCliente.trim() || undefined,
        itens: itens.map((i) => ({
          produtoId: i.produto._id,
          quantidade: i.quantidade,
          observacao: i.observacao?.trim() || undefined,
        })),
      });
      gravar('sessionStorage', CHAVE_NOME, nomeCliente.trim());
      setContaEncerrada(false);
      setAcompanhados((atual) =>
        [...atual, { id: data._id, criadoEm: Date.now() }].slice(-MAX_ACOMPANHADOS)
      );
      onPedidoEnviado();
    } catch (e) {
      const resposta = e.response?.data;
      const primeiroDetalhe = resposta?.detalhes && Object.values(resposta.detalhes).flat()[0];
      setErro(primeiroDetalhe || resposta?.erro || 'Não foi possível enviar o pedido. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };

  // ao abrir o painel, atualiza na hora (sem esperar o próximo ciclo)
  const abrirPainel = () => {
    setAberto(true);
    atualizar();
  };

  const removerDaLista = (id) => setAcompanhados((atual) => atual.filter((p) => p.id !== id));

  const temBarra = qtdTotal > 0 || acompanhados.length > 0;
  const mostrarAvisoConta = contaEncerrada && qtdTotal === 0 && !aberto; // aberto: o aviso aparece dentro do painel

  const cancelarPedido = () => {
    onLimparCarrinho();
    setConfirmandoCancelar(false);
    setErro('');
    setAberto(false);
  };

  return (
    <>
      {(temBarra || mostrarAvisoConta) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          {mostrarAvisoConta && (
            <div className="mx-auto mb-2 flex w-full max-w-6xl items-center justify-between gap-3 rounded-md bg-ok-soft px-4 py-2 text-sm text-ok-ink">
              <span>Conta encerrada. Obrigado pela visita!</span>
              <button type="button" onClick={() => setContaEncerrada(false)} className="font-semibold underline">
                Ok
              </button>
            </div>
          )}
          {temBarra && (
            <button
              type="button"
              onClick={abrirPainel}
              className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-md bg-brand-gradient px-4 py-3 text-left text-white shadow-md transition hover:brightness-110"
            >
              <span className="flex items-center gap-2 font-semibold">
                <IconCart className="h-5 w-5" />
                {qtdTotal > 0
                  ? `Ver pedido (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})`
                  : conta
                    ? `Comanda da mesa ${String(conta.mesaNumero).padStart(2, '0')}`
                    : 'Meus pedidos'}
              </span>
              <span className="text-sm font-semibold">
                {qtdTotal > 0
                  ? dinheiro(valorCarrinho)
                  : haPendente
                    ? 'Aguardando confirmação'
                    : conta
                      ? `Total ${dinheiro(conta.total)}`
                      : 'Ver detalhes'}
              </span>
            </button>
          )}
        </div>
      )}

      <Modal
        open={aberto}
        onClose={confirmandoCancelar ? undefined : () => setAberto(false)}
        title={itens.length > 0 ? 'Seu carrinho' : 'Acompanhar pedido'}
        description={itens.length > 0 ? 'Confira os itens antes de finalizar.' : undefined}
        size="lg"
        footer={
          itens.length > 0 ? (
            <div className="flex w-full flex-col gap-2">
              <Button size="lg" fullWidth onClick={enviar} loading={enviando}>
                {enviando ? 'Enviando...' : `Finalizar pedido · ${dinheiro(valorCarrinho)}`}
              </Button>
              <Button
                variant="strong"
                size="lg"
                fullWidth
                disabled={enviando}
                onClick={() => setConfirmandoCancelar(true)}
              >
                Cancelar pedido
              </Button>
            </div>
          ) : undefined
        }
      >
        {itens.length > 0 && (
          <>
            <ul className="mb-5 divide-y divide-line">
              {itens.map((i) => (
                <li key={i.produto._id} className="flex gap-3 py-3 first:pt-0">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {i.produto.imagemUrl && (
                      <img src={i.produto.imagemUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{i.produto.nome}</p>
                        <p className="text-sm text-ink-soft">{dinheiro(i.produto.preco * i.quantidade)}</p>
                      </div>
                      <Stepper
                        lixeira
                        valor={i.quantidade}
                        nome={i.produto.nome}
                        onDecrement={() => onAlterarQuantidade(i.produto, -1)}
                        onIncrement={() => onAlterarQuantidade(i.produto, 1)}
                      />
                    </div>
                    <input
                      value={i.observacao}
                      onChange={(e) => onObservacao(i.produto._id, e.target.value)}
                      maxLength={140}
                      aria-label={`Observação para ${i.produto.nome}`}
                      placeholder="Observação (ex.: sem cebola)"
                      className="mt-2 h-8 w-full rounded-md border border-line bg-muted px-3 text-xs text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </li>
              ))}
            </ul>

            <p className="mb-2 text-sm font-semibold">Qual é a sua mesa?</p>
            <div className="mb-1 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {mesas.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  disabled={!m.aceitaPedido}
                  onClick={() => escolherMesa(m._id)}
                  aria-pressed={mesaId === m._id}
                  className={cn(
                    'h-10 rounded-md border text-sm font-semibold transition',
                    mesaId === m._id
                      ? 'border-primary bg-primary text-white'
                      : 'border-line bg-muted text-ink hover:bg-tile',
                    !m.aceitaPedido && 'cursor-not-allowed opacity-40'
                  )}
                >
                  {String(m.numero).padStart(2, '0')}
                </button>
              ))}
            </div>
            {!mesas.length && !erro && <p className="text-sm text-ink-soft">Carregando mesas...</p>}
            <p className="mb-4 text-xs text-ink-faint">
              Confira o número da sua mesa. O garçom confirma o pedido antes de ele ir para a cozinha.
            </p>

            <Input
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              maxLength={40}
              label="Seu nome (opcional)"
              placeholder="Como o garçom pode te chamar?"
            />

            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-semibold">{dinheiro(valorCarrinho)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Os valores não incluem taxa de serviço; a conta final é fechada no caixa.
            </p>

            {erro && (
              <p role="alert" className="mt-3 text-sm text-danger-ink">
                {erro}
              </p>
            )}
          </>
        )}

        {pedidosEmAberto.length > 0 && (
          <section className={itens.length > 0 ? 'mt-6 border-t border-line pt-4' : 'mb-4'}>
            {itens.length > 0 && <h3 className="mb-3 font-display text-base">Pedidos enviados</h3>}
            <div className="space-y-3">
              {pedidosEmAberto.map((p) => (
                <CartaoPedido key={p._id} pedido={p} onRemover={() => removerDaLista(p._id)} />
              ))}
            </div>
          </section>
        )}

        {contas.map((c) => (
          <ComandaDaMesa key={c.mesaId} conta={c} separar={itens.length > 0 || pedidosEmAberto.length > 0} />
        ))}

        {!itens.length &&
          !pedidosEmAberto.length &&
          !contas.length &&
          (contaEncerrada ? (
            <div className="my-4 rounded-lg bg-ok-soft p-4 text-center text-ok-ink">
              <p className="font-semibold">Conta encerrada. Obrigado pela visita!</p>
              <button
                type="button"
                onClick={() => {
                  setContaEncerrada(false);
                  setAberto(false);
                }}
                className="mt-2 text-sm underline"
              >
                Ok
              </button>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink-soft">
              {acompanhados.length
                ? 'Carregando seus pedidos...'
                : 'Seu carrinho está vazio. Toque em “Adicionar” nos itens do cardápio.'}
            </p>
          ))}
      </Modal>

      <ConfirmDialog
        open={confirmandoCancelar}
        title="Cancelar este pedido?"
        message="Todos os itens do carrinho serão removidos."
        confirmLabel="Cancelar pedido"
        cancelLabel="Voltar ao carrinho"
        onConfirm={cancelarPedido}
        onCancel={() => setConfirmandoCancelar(false)}
      />
    </>
  );
}

// Comanda COMPARTILHADA da mesa: todos que dividem a mesa veem a mesma conta.
// Itens iguais aparecem empilhados (2× Hamburguer), mesmo que tenham sido pedidos
// por pessoas diferentes.
function ComandaDaMesa({ conta, separar }) {
  const varias = conta.comandas.length > 1;

  return (
    <section className={separar ? 'mt-6 border-t border-line pt-4' : ''}>
      <h3 className="mb-3 font-display text-base">
        Comanda da mesa {String(conta.mesaNumero).padStart(2, '0')}
      </h3>

      <div className="space-y-4">
        {conta.comandas.map((comanda) => (
          <div key={comanda.numero}>
            {varias && <p className="mb-1 text-xs font-semibold text-ink-soft">Comanda #{comanda.numero}</p>}
            <ul className="space-y-3 text-sm">
              {agruparItens(comanda.itens, (i) => i.situacao).map((grupo) => {
                const cancelado = grupo.situacao === 'cancelado';
                const rotulo = ROTULO_SITUACAO[grupo.situacao] ?? ROTULO_SITUACAO.na_fila;
                const meus = grupo.itens.filter((i) => i.meu).reduce((s, i) => s + i.quantidade, 0);
                const origem =
                  meus === 0
                    ? 'Pedido de outra pessoa da mesa'
                    : meus < grupo.quantidade
                      ? `Você pediu ${meus}`
                      : null;

                return (
                  <li key={grupo.chave} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cancelado ? 'text-ink-faint line-through' : ''}>
                        {grupo.quantidade}× {grupo.nomeProduto}
                      </p>
                      {grupo.observacao && <p className="text-xs text-ink-soft">{grupo.observacao}</p>}
                      <span
                        className={cn(
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          rotulo.classe
                        )}
                      >
                        {rotulo.texto}
                      </span>
                      {origem && <span className="ml-2 text-xs text-ink-faint">{origem}</span>}
                    </div>
                    <span className={cn('shrink-0', cancelado && 'text-ink-faint line-through')}>
                      {dinheiro(grupo.quantidade * grupo.precoUnitario)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-muted p-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total da comanda</span>
          <span className="text-lg font-semibold">{dinheiro(conta.total)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-ink-soft">
          <span>O que você pediu</span>
          <span>{dinheiro(conta.meuTotal)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          É a mesma comanda para todos da mesa. Os valores não incluem taxa de serviço; a conta
          final é fechada no caixa.
        </p>
      </div>
    </section>
  );
}

// Pedido que ainda não virou comanda: aguardando o garçom ou recusado.
function CartaoPedido({ pedido, onRemover }) {
  const hora = new Date(pedido.criadoEm).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const mesa = pedido.mesaNumero ? `Mesa ${String(pedido.mesaNumero).padStart(2, '0')}` : 'Mesa';
  const pendente = pedido.status === 'pendente';
  const riscado = pendente ? '' : 'text-ink-faint line-through';

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {mesa} <span className="font-normal text-ink-faint">· {hora}</span>
        </p>
        <Badge tone={pendente ? 'warning' : 'danger'} dot={false}>
          {pendente ? 'Aguardando garçom' : 'Não confirmado'}
        </Badge>
      </div>

      {pendente ? (
        <p className="mb-2 text-xs text-ink-soft">O garçom vai conferir o pedido. Esta tela atualiza sozinha.</p>
      ) : (
        <p className="mb-2 text-sm text-danger-ink">
          {pedido.motivoRecusa ? `Motivo: ${pedido.motivoRecusa}. ` : ''}
          Fale com um garçom para ajustar o pedido.
        </p>
      )}

      <ul className="space-y-1 text-sm">
        {pedido.itens.map((i, idx) => (
          <li key={idx} className="flex items-start justify-between gap-2">
            <span className={riscado}>
              {i.quantidade}× {i.nomeProduto}
              {i.observacao && <span className="block text-xs text-ink-soft">{i.observacao}</span>}
            </span>
            <span className={cn('shrink-0', riscado)}>{dinheiro(i.quantidade * i.precoUnitario)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
        {pendente ? (
          <>
            <span className="text-xs text-ink-soft">Valor previsto</span>
            <span className="font-semibold">{dinheiro(pedido.total)}</span>
          </>
        ) : (
          <button type="button" onClick={onRemover} className="text-xs text-ink-soft underline">
            Remover da lista
          </button>
        )}
      </div>
    </div>
  );
}
