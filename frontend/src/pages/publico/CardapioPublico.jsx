import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosClient';
import PainelPedido from '../../components/publico/PainelPedido';
import CartaoProduto from '../../components/publico/CartaoProduto';
import ProdutoDetalhe from '../../components/publico/ProdutoDetalhe';
import { Button, Chip, EmptyState, IconLogin, IconSearch, Input, Logo, Spinner, ThemeToggle } from '../../components/ui';
import { toast } from '../../store/toastStore';

const TODOS = 'todos';
const MAX_POR_ITEM = 20; // mesmo limite validado no servidor

// RF03 - Home pública: o cardápio é a primeira coisa que qualquer visitante
// vê, sem precisar logar (o acesso de funcionário fica no botão discreto
// "Entrar", no canto). Reaproveita o GET /cardapio, que já devolve só
// categorias e produtos ativos, agrupados.
export default function CardapioPublico() {
  const [grupos, setGrupos] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(TODOS);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [produtoAbertoId, setProdutoAbertoId] = useState(null);

  // Autoatendimento: carrinho do cliente, { [produtoId]: { produto, quantidade, observacao } }.
  // O envio e o acompanhamento do pedido ficam no <PainelPedido />.
  const [carrinho, setCarrinho] = useState({});

  const alterarQuantidade = (produto, delta) => {
    setCarrinho((atual) => {
      const existente = atual[produto._id];
      const quantidade = Math.min(MAX_POR_ITEM, (existente?.quantidade ?? 0) + delta);
      if (quantidade <= 0) {
        const resto = { ...atual };
        delete resto[produto._id];
        return resto;
      }
      return {
        ...atual,
        [produto._id]: { produto, quantidade, observacao: existente?.observacao ?? '' },
      };
    });
  };

  const definirObservacao = (produtoId, observacao) => {
    setCarrinho((atual) =>
      atual[produtoId] ? { ...atual, [produtoId]: { ...atual[produtoId], observacao } } : atual
    );
  };

  const carregar = useCallback(() => {
    setCarregando(true);
    api
      .get('/cardapio')
      .then((r) => {
        setGrupos(r.data);
        setErro('');
      })
      .catch(() => setErro('Não foi possível carregar o cardápio agora.'))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Filtro é local: a busca no servidor existe (?busca=), mas filtrar aqui
  // dá resposta instantânea enquanto a pessoa digita, sem ida e volta à API.
  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return grupos
      .filter((g) => categoriaAtiva === TODOS || g._id === categoriaAtiva)
      .map((g) => ({
        ...g,
        produtos: termo
          ? g.produtos.filter((p) => p.nome.toLowerCase().includes(termo))
          : g.produtos,
      }))
      .filter((g) => g.produtos.length > 0);
  }, [grupos, categoriaAtiva, busca]);

  const produtoAberto = useMemo(
    () => grupos.flatMap((g) => g.produtos).find((p) => p._id === produtoAbertoId) ?? null,
    [grupos, produtoAbertoId]
  );

  // ao abrir um produto (ou voltar), a página começa do topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [produtoAbertoId]);

  const confirmarDetalhe = (produto, quantidade, observacao) => {
    const existente = carrinho[produto._id]?.quantidade ?? 0;
    alterarQuantidade(produto, quantidade - existente);
    definirObservacao(produto._id, observacao);
    toast.success(existente ? 'Carrinho atualizado' : 'Adicionado ao carrinho', produto.nome);
    setProdutoAbertoId(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas-warm text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-muted dark:bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo showName className="h-9 text-ink" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* RF01 - acesso de funcionário fica aqui, discreto, sem ocupar
                o espaço principal da tela, que é do cliente */}
            <Link
              to="/login"
              aria-label="Entrar (acesso de funcionários)"
              title="Acesso de funcionários"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-ink"
            >
              <IconLogin />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-28">
        {produtoAberto ? (
          <ProdutoDetalhe
            key={produtoAberto._id}
            produto={produtoAberto}
            quantidadeNoCarrinho={carrinho[produtoAberto._id]?.quantidade ?? 0}
            observacaoNoCarrinho={carrinho[produtoAberto._id]?.observacao ?? ''}
            onVoltar={() => setProdutoAbertoId(null)}
            onConfirmar={(quantidade, observacao) => confirmarDetalhe(produtoAberto, quantidade, observacao)}
          />
        ) : (
          <>
            <section className="mb-8 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Bem-vindo ao nosso
              </p>
              <h1 className="font-display text-3xl leading-tight">Cardápio Digital</h1>
              <p className="mt-1 text-sm text-ink-soft">Escolha seus itens favoritos e faça seu pedido.</p>

              <Input
                className="mt-5"
                type="search"
                aria-label="Buscar no cardápio"
                leftIcon={<IconSearch className="h-4 w-4" />}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar item, categoria..."
              />

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <Chip active={categoriaAtiva === TODOS} onClick={() => setCategoriaAtiva(TODOS)}>
                  Todos
                </Chip>
                {grupos.map((g) => (
                  <Chip key={g._id} active={categoriaAtiva === g._id} onClick={() => setCategoriaAtiva(g._id)}>
                    {g.nome}
                  </Chip>
                ))}
              </div>
            </section>

            {carregando && (
              <p className="flex items-center gap-2 text-sm text-ink-soft">
                <Spinner label="Carregando" /> Carregando cardápio...
              </p>
            )}

            {erro && !carregando && (
              <EmptyState
                title="Cardápio indisponível"
                description={erro}
                action={<Button variant="strong" onClick={carregar}>Tentar de novo</Button>}
              />
            )}

            {!carregando && !erro && !gruposFiltrados.length && (
              <EmptyState
                title="Nenhum produto encontrado"
                description="Tente outro nome ou volte para todas as categorias."
                action={
                  (busca || categoriaAtiva !== TODOS) && (
                    <Button
                      variant="strong"
                      onClick={() => {
                        setBusca('');
                        setCategoriaAtiva(TODOS);
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )
                }
              />
            )}

            {gruposFiltrados.map((g) => (
              <section key={g._id} className="mb-10">
                <h2 className="mb-4 font-display text-xl">{g.nome}</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {g.produtos.map((p) => (
                    <CartaoProduto
                      key={p._id}
                      produto={p}
                      quantidade={carrinho[p._id]?.quantidade ?? 0}
                      onAbrir={() => setProdutoAbertoId(p._id)}
                      onAdicionar={() => alterarQuantidade(p, 1)}
                      onRemover={() => alterarQuantidade(p, -1)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      <footer className="border-t border-line py-4 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
        Gestão que serve resultados
      </footer>

      <PainelPedido
        itens={Object.values(carrinho)}
        onAlterarQuantidade={alterarQuantidade}
        onObservacao={definirObservacao}
        onPedidoEnviado={() => setCarrinho({})}
        onLimparCarrinho={() => setCarrinho({})}
      />
    </div>
  );
}
