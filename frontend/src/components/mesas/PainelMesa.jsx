import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axiosClient';
import { toast } from '../../store/toastStore';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  IconCheck,
  IconChevronDown,
  IconClipboard,
  IconClock,
  IconPlus,
  Input,
  Menu,
  Spinner,
  Textarea,
} from '../ui';
import { cn } from '../../lib/cn';
import { agruparItens } from '../../utils/agruparItens';
import {
  ROTULO_STATUS_ITEM,
  arredondar,
  descontoComanda,
  itensAtivos,
  repartirDesconto,
  subtotalComanda,
  totalComanda,
} from '../../utils/comanda';
import { dinheiro, dinheiroCampo, lerDinheiro } from '../../utils/dinheiro';
import { mensagemErro } from '../../utils/erroApi';
import { horaCurta } from '../../utils/tempo';
import { Duracao } from './Cronometro';
import { ROTULO_STATUS_MESA } from './MesaCard';
import AdicionarItemModal from './AdicionarItemModal';
import EstornoModal from './EstornoModal';
import PagamentoModal from './PagamentoModal';

const TOM_STATUS = { livre: 'neutral', ocupada: 'ok', aguardando_fechamento: 'warning' };
const pad = (n, tamanho) => String(n).padStart(tamanho, '0');
const somar = (lista, fn) => arredondar(lista.reduce((soma, x) => soma + fn(x), 0));

function Secao({ titulo, acao, children }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

function ComandaBloco({ comanda, recolhida, onAlternar, onAdicionarItem, onFecharComanda, onEstornar }) {
  const itens = itensAtivos(comanda);
  // Itens iguais empilham ("2x Refrigerante"), mas cada lançamento segue separado: é ele que se estorna.
  const grupos = agruparItens(itens, (i) => i.statusKDS);

  return (
    <div className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={!recolhida}
        className="flex w-full items-center justify-between rounded-md bg-muted px-3 py-2 text-left text-xs transition hover:bg-tile"
      >
        <span className="font-semibold">Comanda #{pad(comanda.numero, 3)}</span>
        <span className="flex items-center gap-2 text-ok-ink">
          Aberta
          <IconChevronDown className={cn('h-4 w-4 transition-transform', !recolhida && 'rotate-180')} />
        </span>
      </button>

      {!recolhida && (
        <div className="px-1 pt-2">
          {grupos.length === 0 ? (
            <p className="py-3 text-xs text-ink-faint">Nenhum item lançado ainda.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-1 font-semibold">Item</th>
                  <th className="py-1 text-center font-semibold">Qtd</th>
                  <th className="py-1 text-right font-semibold">Valor</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {grupos.map((grupo) => {
                  const detalhe = [grupo.observacao, ROTULO_STATUS_ITEM[grupo.statusKDS]]
                    .filter(Boolean)
                    .join(' · ');
                  const varios = grupo.itens.length > 1;
                  return (
                    <tr key={grupo.chave} className="border-t border-line align-top">
                      <td className="py-2 pr-2">
                        <p className="font-medium leading-tight">{grupo.nomeProduto}</p>
                        {detalhe && <p className="mt-0.5 text-[11px] text-ink-faint">{detalhe}</p>}
                      </td>
                      <td className="py-2 text-center tabular-nums">{grupo.quantidade}</td>
                      <td className="whitespace-nowrap py-2 text-right tabular-nums">
                        {dinheiro(grupo.precoUnitario * grupo.quantidade)}
                      </td>
                      <td className="py-1 text-right">
                        <Menu
                          rotulo={`Ações de ${grupo.nomeProduto}`}
                          itens={grupo.itens.map((item, i) => ({
                            texto: varios
                              ? `Estornar lançamento ${i + 1} (${item.quantidade}× às ${horaCurta(item.lancadoEm)})`
                              : 'Estornar item',
                            perigo: true,
                            onClick: () => onEstornar(item),
                          }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="strong"
              leftIcon={<IconPlus className="h-4 w-4" />}
              onClick={onAdicionarItem}
            >
              Adicionar item
            </Button>
            <Menu
              rotulo={`Mais ações da comanda #${pad(comanda.numero, 3)}`}
              itens={[{ texto: 'Fechar e pagar esta comanda', onClick: onFecharComanda }]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Painel lateral "MESA 00" (RF04/RF07/RF08/RF09/RF11): comandas com itens, desconto,
 * totais e fechamento da mesa. Monte com key={mesa._id} para começar limpo a cada mesa.
 *
 * - sinal: número que muda quando algo ao vivo (socket) pede para recarregar as comandas.
 * - podeDesconto: só o administrador (RF09). O backend é quem barra de verdade.
 * - podeReabrir: só o administrador (RF12).
 * - onMesaMudou(mesa?): avisa a tela que a mesa mudou (abriu, fechou, reabriu).
 */
export default function PainelMesa({ mesa, sinal, podeDesconto, podeReabrir, onMesaMudou }) {
  const numero = pad(mesa.numero, 2);
  const [comandas, setComandas] = useState(null); // null = carregando
  const [erroCarga, setErroCarga] = useState('');
  const [recolhidas, setRecolhidas] = useState({}); // id da comanda -> true
  const [modal, setModal] = useState(null);
  const [abrindo, setAbrindo] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  // formulário de desconto
  const [tipoDesconto, setTipoDesconto] = useState('percentual');
  const [valorDesconto, setValorDesconto] = useState('0,00');
  const [obsDesconto, setObsDesconto] = useState('');
  const [erroDesconto, setErroDesconto] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const descontoIniciado = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get(`/comandas/mesa/${mesa._id}`);
      setComandas(data);
      setErroCarga('');
    } catch (err) {
      setErroCarga(mensagemErro(err, 'Não foi possível carregar as comandas.'));
    }
  }, [mesa._id]);

  // recarrega quando chega aviso ao vivo ou quando a mesa muda de status
  useEffect(() => {
    carregar();
  }, [carregar, sinal, mesa.status]);

  // só as comandas em aberto contam para a tela e para o total a receber
  const abertas = useMemo(() => (comandas ?? []).filter((c) => c.status === 'aberta'), [comandas]);
  const subtotal = somar(abertas, subtotalComanda);
  const desconto = somar(abertas, descontoComanda);
  const total = somar(abertas, totalComanda);

  // Na primeira carga, o formulário já mostra o desconto que estiver aplicado na mesa.
  useEffect(() => {
    if (descontoIniciado.current || comandas === null) return;
    descontoIniciado.current = true;
    const comDesconto = abertas.filter((c) => (c.desconto?.valor ?? 0) > 0);
    if (comDesconto.length === 0) return;

    const primeiro = comDesconto[0].desconto;
    const mesmoPercentual =
      comDesconto.length === abertas.length &&
      comDesconto.every((c) => c.desconto.tipo === 'percentual' && c.desconto.valor === primeiro.valor);
    setTipoDesconto(mesmoPercentual ? 'percentual' : 'valor');
    setValorDesconto(dinheiroCampo(mesmoPercentual ? primeiro.valor : somar(abertas, descontoComanda)));
    setObsDesconto(primeiro.observacao ?? '');
  }, [comandas, abertas]);

  const fecharModal = () => setModal(null);
  const comandaDoModal = comandas?.find((c) => c._id === modal?.comandaId);

  // ---------- ações ----------
  async function abrirComanda() {
    setAbrindo(true);
    try {
      const { data } = await api.post('/comandas/abrir', { mesaId: mesa._id });
      onMesaMudou(data.mesa);
      toast.success(
        mesa.status === 'livre' ? 'Mesa aberta' : 'Comanda aberta',
        `Mesa ${numero} · Comanda #${pad(data.comanda.numero, 3)}`
      );
      await carregar();
    } catch (err) {
      toast.error('Não foi possível abrir a comanda', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setAbrindo(false);
    }
  }

  async function adicionarItem(dados) {
    await api.post(`/comandas/${modal.comandaId}/itens`, dados);
    toast.success('Item adicionado', `Comanda #${pad(comandaDoModal?.numero ?? 0, 3)}`);
    fecharModal();
    await carregar();
  }

  async function estornarItem(motivo) {
    await api.patch(`/comandas/${modal.comandaId}/itens/${modal.item.itemId}/estornar`, { motivo });
    toast.success('Item estornado', modal.item.nome);
    fecharModal();
    await carregar();
  }

  async function pagarMesa(metodos) {
    await api.post(`/pagamentos/mesa/${mesa._id}/fechar`, { metodos });
    toast.success('Mesa fechada', `Mesa ${numero} · ${dinheiro(total)}`);
    fecharModal();
    onMesaMudou();
    await carregar();
  }

  async function pagarComanda(metodos) {
    await api.post(`/pagamentos/comanda/${modal.comandaId}/fechar`, { metodos });
    toast.success('Comanda fechada', `Comanda #${pad(comandaDoModal?.numero ?? 0, 3)}`);
    fecharModal();
    onMesaMudou(); // se era a última comanda aberta, a mesa volta a ficar livre
    await carregar();
  }

  // RF12 - desfaz um fechamento feito por engano (estorna o último pagamento)
  async function reabrirMesa() {
    setReabrindo(true);
    try {
      const { data } = await api.patch(`/mesas/${mesa._id}/reabrir`);
      onMesaMudou(data.mesa);
      toast.success('Mesa reaberta', `Mesa ${numero} · último pagamento estornado`);
      await carregar();
    } catch (err) {
      toast.error('Não foi possível reabrir a mesa', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setReabrindo(false);
      fecharModal();
    }
  }

  // RF09 - o backend guarda o desconto por comanda; aqui aplicamos na mesa toda.
  async function aplicarDesconto() {
    const valor = lerDinheiro(valorDesconto);
    if (!Number.isFinite(valor) || valor < 0) return setErroDesconto('Informe um valor válido.');
    if (tipoDesconto === 'percentual' && valor > 100) return setErroDesconto('O desconto não pode passar de 100%.');
    if (tipoDesconto === 'valor' && valor > subtotal) {
      return setErroDesconto('O desconto não pode ser maior que o subtotal.');
    }

    setErroDesconto('');
    setAplicando(true);
    try {
      const valores = tipoDesconto === 'percentual' ? abertas.map(() => valor) : repartirDesconto(abertas, valor);
      await Promise.all(
        abertas.map((c, i) =>
          api.patch(`/comandas/${c._id}/desconto`, {
            tipo: tipoDesconto,
            valor: valores[i],
            observacao: obsDesconto.trim() || undefined,
          })
        )
      );
      toast.success(valor > 0 ? 'Desconto aplicado' : 'Desconto removido', `Mesa ${numero}`);
    } catch (err) {
      toast.error('Não foi possível aplicar o desconto', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setAplicando(false);
      await carregar();
    }
  }

  function trocarTipoDesconto(tipo) {
    setTipoDesconto(tipo);
    setValorDesconto('0,00');
    setErroDesconto('');
  }

  // ---------- tela ----------
  const livre = mesa.status === 'livre';
  const comTempo = !livre && mesa.abertaEm;

  return (
    <>
      <header className="shrink-0 border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-2xl uppercase leading-none">Mesa</p>
            <Badge tone={TOM_STATUS[mesa.status]} className="mt-2">
              {ROTULO_STATUS_MESA[mesa.status]}
            </Badge>
          </div>
          <p className="font-display text-5xl leading-none">{numero}</p>
        </div>
        {comTempo && (
          <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
            <span>Desde {horaCurta(mesa.abertaEm)}</span>
            <span className="inline-flex items-center gap-1.5">
              <IconClock className="h-4 w-4" />
              <Duracao desde={mesa.abertaEm} />
            </span>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {livre ? (
          <EmptyState
            icon={<IconClipboard className="h-8 w-8" />}
            title="Mesa livre"
            description="Abra a mesa para começar a lançar pedidos."
            action={
              <div className="flex flex-col items-center gap-2">
                <Button
                  leftIcon={<IconPlus className="h-4 w-4" />}
                  onClick={abrirComanda}
                  loading={abrindo}
                >
                  Abrir mesa
                </Button>
                {podeReabrir && (
                  <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'reabrir' })}>
                    Desfazer último fechamento
                  </Button>
                )}
              </div>
            }
          />
        ) : comandas === null ? (
          <div className="flex justify-center p-10 text-ink-soft">
            {erroCarga ? (
              <div className="text-center">
                <p className="mb-3 text-sm text-danger-ink">{erroCarga}</p>
                <Button variant="secondary" size="sm" onClick={carregar}>
                  Tentar de novo
                </Button>
              </div>
            ) : (
              <Spinner label="Carregando comandas" />
            )}
          </div>
        ) : (
          <>
            <Secao
              titulo="Comandas"
              acao={
                <Button
                  size="sm"
                  variant="strong"
                  className="dark:bg-primary dark:text-white"
                  leftIcon={<IconPlus className="h-4 w-4" />}
                  onClick={abrirComanda}
                  loading={abrindo}
                  disabled={mesa.status === 'aguardando_fechamento'}
                  title={
                    mesa.status === 'aguardando_fechamento'
                      ? 'Mesa aguardando fechamento: não dá para abrir outra comanda.'
                      : undefined
                  }
                >
                  Nova comanda
                </Button>
              }
            >
              {abertas.length === 0 ? (
                <p className="text-sm text-ink-faint">Nenhuma comanda aberta.</p>
              ) : (
                abertas.map((comanda) => (
                  <ComandaBloco
                    key={comanda._id}
                    comanda={comanda}
                    recolhida={Boolean(recolhidas[comanda._id])}
                    onAlternar={() => setRecolhidas((r) => ({ ...r, [comanda._id]: !r[comanda._id] }))}
                    onAdicionarItem={() => setModal({ tipo: 'item', comandaId: comanda._id })}
                    onFecharComanda={() => setModal({ tipo: 'pagamento', comandaId: comanda._id })}
                    onEstornar={(item) =>
                      setModal({
                        tipo: 'estorno',
                        comandaId: comanda._id,
                        item: {
                          itemId: item._id,
                          nome: item.nomeProduto,
                          quantidade: item.quantidade,
                          valor: item.precoUnitario * item.quantidade,
                        },
                      })
                    }
                  />
                ))
              )}
            </Secao>

            {podeDesconto && abertas.length > 0 && (
              <Secao
                titulo="Desconto"
                acao={
                  <div role="group" aria-label="Tipo de desconto" className="inline-flex gap-1">
                    {[
                      ['percentual', '%'],
                      ['valor', 'R$'],
                    ].map(([tipo, rotulo]) => (
                      <button
                        key={tipo}
                        type="button"
                        aria-pressed={tipoDesconto === tipo}
                        onClick={() => trocarTipoDesconto(tipo)}
                        className={cn(
                          'h-7 min-w-9 rounded px-2 text-xs font-semibold transition',
                          tipoDesconto === tipo
                            ? 'bg-strong text-strong-ink dark:bg-primary dark:text-white'
                            : 'bg-tile text-ink-soft hover:text-ink'
                        )}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <Input
                    label={tipoDesconto === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                    inputMode="decimal"
                    value={valorDesconto}
                    onChange={(e) => setValorDesconto(e.target.value)}
                    aria-invalid={erroDesconto ? true : undefined}
                  />
                  <Button variant="secondary" onClick={aplicarDesconto} loading={aplicando}>
                    Aplicar
                  </Button>
                </div>
                {erroDesconto && (
                  <p role="alert" className="mt-1 text-xs text-danger-ink">
                    {erroDesconto}
                  </p>
                )}
                <Textarea
                  className="mt-3"
                  label="Observação (opcional)"
                  rows={3}
                  maxLength={120}
                  value={obsDesconto}
                  onChange={(e) => setObsDesconto(e.target.value)}
                  placeholder="Ex.: Cliente VIP, aniversário, etc."
                />
              </Secao>
            )}
          </>
        )}
      </div>

      {!livre && comandas !== null && (
        <footer className="shrink-0 border-t border-line px-5 py-4">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{dinheiro(subtotal)}</dd>
            </div>
            <div className="flex justify-between font-medium text-ok-ink">
              <dt>Desconto</dt>
              <dd className="tabular-nums">-{dinheiro(desconto)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide">Total da mesa</span>
            <span className="font-display text-xl tabular-nums">{dinheiro(total)}</span>
          </div>
          <Button
            fullWidth
            size="lg"
            className="mt-4"
            leftIcon={<IconCheck className="h-5 w-5" />}
            disabled={abertas.length === 0}
            onClick={() => setModal({ tipo: 'pagamento' })}
          >
            Fechar Mesa
          </Button>
        </footer>
      )}

      {modal?.tipo === 'item' && comandaDoModal && (
        <AdicionarItemModal comanda={comandaDoModal} onAdicionar={adicionarItem} onFechar={fecharModal} />
      )}
      {modal?.tipo === 'estorno' && <EstornoModal item={modal.item} onConfirmar={estornarItem} onFechar={fecharModal} />}
      {modal?.tipo === 'pagamento' && (modal.comandaId ? comandaDoModal : abertas.length > 0) && (
        <PagamentoModal
          titulo={modal.comandaId ? `Fechar comanda #${pad(comandaDoModal.numero, 3)}` : `Fechar mesa ${numero}`}
          descricao={
            modal.comandaId
              ? 'Só esta comanda é paga; as demais continuam abertas.'
              : `Paga todas as comandas abertas (${abertas.length}) e libera a mesa.`
          }
          total={modal.comandaId ? totalComanda(comandaDoModal) : total}
          onConfirmar={modal.comandaId ? pagarComanda : pagarMesa}
          onFechar={fecharModal}
        />
      )}
      <ConfirmDialog
        open={modal?.tipo === 'reabrir'}
        title={`Reabrir a mesa ${numero}?`}
        message="O último pagamento será estornado e a comanda volta a ficar aberta."
        confirmLabel="Reabrir mesa"
        loading={reabrindo}
        onConfirm={reabrirMesa}
        onCancel={fecharModal}
      />
    </>
  );
}
