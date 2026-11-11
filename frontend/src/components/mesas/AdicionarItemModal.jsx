import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosClient';
import { Badge, Button, Chip, EmptyState, IconSearch, Input, Modal, Spinner, Stepper, Textarea } from '../ui';
import { cn } from '../../lib/cn';
import { dinheiro } from '../../utils/dinheiro';
import { mensagemErro } from '../../utils/erroApi';

const QUANTIDADE_MAXIMA = 99;

/**
 * Lançar item numa comanda (RF07): escolhe o produto do cardápio, a quantidade e a
 * observação (com as mais usadas do produto como atalho, RF21). Monte só quando for abrir.
 * `onAdicionar({ produtoId, quantidade, observacao })` devolve uma Promise; se falhar,
 * a mensagem aparece aqui dentro e o modal continua aberto.
 */
export default function AdicionarItemModal({ comanda, onAdicionar, onFechar }) {
  const [grupos, setGrupos] = useState(null); // null = carregando
  const [erroCarga, setErroCarga] = useState('');
  const [busca, setBusca] = useState('');
  const [produto, setProduto] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .get('/cardapio')
      .then((r) => ativo && setGrupos(r.data))
      .catch((err) => ativo && setErroCarga(mensagemErro(err, 'Não foi possível carregar o cardápio.')));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    setSugestoes([]);
    if (!produto) return undefined;
    let ativo = true;
    api
      .get(`/comandas/produtos/${produto._id}/sugestoes`)
      .then((r) => ativo && setSugestoes(r.data))
      .catch(() => {}); // sugestão é só atalho: se falhar, o campo de texto continua valendo
    return () => {
      ativo = false;
    };
  }, [produto]);

  const termo = busca.trim().toLowerCase();
  const visiveis = useMemo(
    () =>
      (grupos ?? [])
        .map((g) => ({
          ...g,
          produtos: termo ? g.produtos.filter((p) => p.nome.toLowerCase().includes(termo)) : g.produtos,
        }))
        .filter((g) => g.produtos.length > 0),
    [grupos, termo]
  );

  function escolher(p) {
    setProduto(p);
    setQuantidade(1);
    setObservacao('');
    setErro('');
  }

  async function adicionar() {
    setErro('');
    setEnviando(true);
    try {
      await onAdicionar({
        produtoId: produto._id,
        quantidade,
        observacao: observacao.trim() || undefined,
      });
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível adicionar o item. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      title="Adicionar item"
      description={`Comanda #${String(comanda.numero).padStart(3, '0')}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={adicionar} loading={enviando} disabled={!produto}>
            {produto ? `Adicionar · ${dinheiro(produto.preco * quantidade)}` : 'Adicionar item'}
          </Button>
        </>
      }
    >
      <Input
        data-autofocus
        leftIcon={<IconSearch className="h-4 w-4" />}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar no cardápio"
        aria-label="Buscar no cardápio"
      />

      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-line">
        {erroCarga ? (
          <p className="p-4 text-sm text-danger-ink">{erroCarga}</p>
        ) : grupos === null ? (
          <div className="flex justify-center p-6 text-ink-soft">
            <Spinner label="Carregando cardápio" />
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState
            className="py-8"
            title="Nenhum produto encontrado"
            description={termo ? 'Tente outro nome.' : 'Cadastre produtos no Cardápio para lançá-los aqui.'}
          />
        ) : (
          visiveis.map((grupo) => (
            <section key={grupo._id}>
              <h3 className="sticky top-0 bg-surface px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {grupo.nome}
              </h3>
              <ul className="px-1 pb-1">
                {grupo.produtos.map((p) => {
                  const escolhido = produto?._id === p._id;
                  return (
                    <li key={p._id}>
                      <button
                        type="button"
                        disabled={!p.disponivel}
                        onClick={() => escolher(p)}
                        aria-pressed={escolhido}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                          escolhido ? 'bg-muted ring-2 ring-primary' : 'hover:bg-muted'
                        )}
                      >
                        <span className="min-w-0 truncate font-medium">{p.nome}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {!p.disponivel && <Badge tone="danger">Indisponível</Badge>}
                          <span className="tabular-nums text-ink-soft">{dinheiro(p.preco)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {produto && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 truncate text-sm font-semibold">{produto.nome}</p>
            <Stepper
              nome={produto.nome}
              valor={quantidade}
              onDecrement={() => setQuantidade((q) => Math.max(1, q - 1))}
              onIncrement={() => setQuantidade((q) => Math.min(QUANTIDADE_MAXIMA, q + 1))}
              decrementoDesabilitado={quantidade <= 1}
              incrementoDesabilitado={quantidade >= QUANTIDADE_MAXIMA}
            />
          </div>

          <Textarea
            label="Observação (opcional)"
            rows={2}
            maxLength={120}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: Ao ponto, sem cebola"
          />

          {sugestoes.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Observações mais usadas">
              {sugestoes.map((texto) => (
                <Chip key={texto} active={observacao === texto} onClick={() => setObservacao(texto)}>
                  {texto}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-3 text-sm text-danger-ink">
          {erro}
        </p>
      )}
    </Modal>
  );
}
