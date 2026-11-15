import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import FiltroSetor from '../../components/cardapio/FiltroSetor';
import ProdutoCard from '../../components/cardapio/ProdutoCard';
import ProdutoFormModal from '../../components/cardapio/ProdutoFormModal';
import CategoriaFormModal from '../../components/cardapio/CategoriaFormModal';
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconPlus,
  IconSearch,
  Input,
  Spinner,
} from '../../components/ui';
import api from '../../api/axiosClient';
import { toast } from '../../store/toastStore';
import { produtoCombinaComBusca } from '../../utils/buscaProduto';
import { mensagemErro } from '../../utils/erroApi';

// "Todos" é uma aba virtual da tela (não existe no banco): mostra o cardápio
// inteiro agrupado por categoria, via GET /cardapio.
const TODOS = 'todos';
const LIMITE_FOTO_BYTES = 5 * 1024 * 1024;

// RF03 - Gestão de Cardápio (CRUD)
export default function Cardapio() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState(TODOS);
  const [produtos, setProdutos] = useState([]); // aba de uma categoria
  const [grupos, setGrupos] = useState([]); // aba "Todos": [{ nome, produtos }]
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('todos'); // 'todos' | 'cozinha' | 'bar'
  const [carregando, setCarregando] = useState(true);

  // Modais: null = fechado
  const [modalProduto, setModalProduto] = useState(null); // { produto? }
  const [modalCategoria, setModalCategoria] = useState(null); // { categoria? }
  const [confirmacao, setConfirmacao] = useState(null); // { tipo: 'produto' | 'categoria', item }
  const [removendo, setRemovendo] = useState(false);

  const carregarCategorias = useCallback(() => {
    api
      .get('/categorias')
      .then((r) => setCategorias(r.data))
      .catch(() => toast.error('Não foi possível carregar as categorias', 'Atualize a página para tentar de novo.'));
  }, []);

  const carregarProdutos = useCallback(() => {
    const requisicao =
      categoriaAtiva === TODOS
        ? api.get('/cardapio').then((r) => setGrupos(r.data))
        : api.get('/produtos', { params: { categoria: categoriaAtiva } }).then((r) => setProdutos(r.data));

    return requisicao
      .catch(() => toast.error('Não foi possível carregar os produtos', 'Atualize a página para tentar de novo.'))
      .finally(() => setCarregando(false));
  }, [categoriaAtiva]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const categoriaSelecionada = categorias.find((c) => c._id === categoriaAtiva);

  // A busca e o filtro de setor funcionam aqui mesmo, na lista já carregada. A busca é por nome,
  // descrição, ingredientes, categoria ou preço (regra em utils/buscaProduto.js).
  const termo = busca.trim();
  const filtrando = Boolean(termo) || setor !== 'todos';
  const filtrar = useCallback(
    (lista, nomeCategoria) =>
      lista.filter(
        (p) =>
          (setor === 'todos' || (p.setor ?? 'cozinha') === setor) &&
          (!termo || produtoCombinaComBusca(p, termo, nomeCategoria))
      ),
    [termo, setor]
  );
  const produtosVisiveis = useMemo(
    () => filtrar(produtos, categoriaSelecionada?.nome),
    [filtrar, produtos, categoriaSelecionada]
  );
  const gruposVisiveis = useMemo(
    () =>
      grupos
        .map((g) => ({ ...g, produtos: filtrar(g.produtos, g.nome) }))
        // filtrando, esconde categorias sem resultado; sem filtro, mostra todas
        .filter((g) => !filtrando || g.produtos.length > 0),
    [filtrar, grupos, filtrando]
  );

  // ---------- categorias ----------
  const salvarCategoria = async (nome) => {
    const categoria = modalCategoria?.categoria;
    if (categoria) {
      await api.put(`/categorias/${categoria._id}`, { nome });
      toast.success('Categoria atualizada', nome);
    } else {
      const { data: nova } = await api.post('/categorias', { nome });
      setCategoriaAtiva(nova._id);
      toast.success('Categoria criada', nome);
    }
    setModalCategoria(null);
    carregarCategorias();
  };

  // RNF11 - "remover" é inativar: sai do cardápio, mas não é apagada do banco.
  // O backend recusa se ainda houver produtos ativos nela e explica o motivo.
  const removerCategoria = async () => {
    const categoria = confirmacao.item;
    setRemovendo(true);
    try {
      await api.delete(`/categorias/${categoria._id}`);
      toast.success('Categoria removida', categoria.nome);
      setCategoriaAtiva(TODOS);
      carregarCategorias();
    } catch (err) {
      toast.error('Não foi possível remover a categoria', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setRemovendo(false);
      setConfirmacao(null);
    }
  };

  // ---------- produtos ----------
  const salvarProduto = async (dados) => {
    const produto = modalProduto?.produto;
    if (produto) {
      await api.put(`/produtos/${produto._id}`, dados);
      toast.success('Produto atualizado', dados.nome);
    } else {
      await api.post('/produtos', dados);
      toast.success('Produto adicionado', dados.nome);
    }
    setModalProduto(null);
    carregarProdutos();
  };

  // RNF11 - inativa em vez de apagar; o histórico de vendas continua intacto.
  const removerProduto = async () => {
    const produto = confirmacao.item;
    setRemovendo(true);
    try {
      await api.delete(`/produtos/${produto._id}`);
      toast.success('Produto removido', produto.nome);
      carregarProdutos();
    } catch (err) {
      toast.error('Não foi possível remover o produto', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setRemovendo(false);
      setConfirmacao(null);
    }
  };

  // RF03 - disponibilidade manual (RF22 continua valendo para o estoque, no futuro).
  const alternarDisponibilidade = async (p) => {
    const tornarDisponivel = p.disponivel === false;
    try {
      await api.patch(`/produtos/${p._id}/disponibilidade`, { disponivel: tornarDisponivel });
      toast.success(tornarDisponivel ? 'Marcado como disponível' : 'Marcado como indisponível', p.nome);
      carregarProdutos();
    } catch (err) {
      toast.error('Não foi possível alterar a disponibilidade', mensagemErro(err, 'Tente de novo.'));
    }
  };

  // Upload direto de arquivo: a foto aparece no cardápio público da home.
  const trocarFoto = async (p, arquivo) => {
    if (!arquivo) return;
    if (arquivo.size > LIMITE_FOTO_BYTES) {
      toast.error('Imagem muito grande', 'O limite é 5 MB. Escolha uma foto menor.');
      return;
    }

    const form = new FormData();
    form.append('imagem', arquivo);

    try {
      await api.post(`/produtos/${p._id}/imagem`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Foto atualizada', p.nome);
      carregarProdutos();
    } catch (err) {
      toast.error('Não foi possível enviar a foto', mensagemErro(err, 'Tente de novo.'));
    }
  };

  const abrirNovoProduto = () => {
    if (!categorias.length) {
      toast.warning('Crie uma categoria primeiro', 'Os produtos precisam estar em uma categoria.');
      return;
    }
    setModalProduto({});
  };

  const acoes = {
    onEditar: (p) => setModalProduto({ produto: p }),
    onRemover: (p) => setConfirmacao({ tipo: 'produto', item: p }),
    onDisponibilidade: alternarDisponibilidade,
    onFoto: trocarFoto,
  };

  const listaProdutos = (lista) => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {lista.map((p) => (
        <ProdutoCard key={p._id} produto={p} {...acoes} />
      ))}
    </div>
  );

  const semProdutos = (
    <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
      Nenhum produto nesta categoria ainda.
    </p>
  );

  return (
    <AdminLayout>
      <PageHeader
        titulo="Cardápio"
        descricao="Gerencie os produtos e categorias do seu cardápio"
        acoes={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalCategoria({})}>
              Nova categoria
            </Button>
            <Button variant="strong" size="sm" leftIcon={<IconPlus className="h-4 w-4" />} onClick={abrirNovoProduto}>
              Adicionar produto
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-t-2 border-line border-t-primary bg-surface p-3">
        <Chip active={categoriaAtiva === TODOS} onClick={() => setCategoriaAtiva(TODOS)}>
          Todos
        </Chip>
        {categorias.map((c) => (
          <Chip key={c._id} active={categoriaAtiva === c._id} onClick={() => setCategoriaAtiva(c._id)}>
            {c.nome}
          </Chip>
        ))}
        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <FiltroSetor valor={setor} onChange={setSetor} />
          <Input
            className="min-w-0 flex-1 sm:w-64 sm:flex-none"
            type="search"
            aria-label="Buscar produto por nome, descrição ou preço"
            leftIcon={<IconSearch className="h-4 w-4" />}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome, descrição ou preço..."
          />
        </div>
      </div>

      {categoriaSelecionada && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Categoria “{categoriaSelecionada.nome}”:</span>
          <Button variant="ghost" size="sm" onClick={() => setModalCategoria({ categoria: categoriaSelecionada })}>
            Editar categoria
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-ink"
            onClick={() => setConfirmacao({ tipo: 'categoria', item: categoriaSelecionada })}
          >
            Remover categoria
          </Button>
        </div>
      )}

      {carregando ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner label="Carregando" /> Carregando cardápio...
        </p>
      ) : categoriaAtiva === TODOS ? (
        gruposVisiveis.length ? (
          gruposVisiveis.map((g) => (
            <section key={g._id} className="mb-8">
              <h2 className="mb-3 font-display text-base">{g.nome}</h2>
              {g.produtos.length ? listaProdutos(g.produtos) : semProdutos}
            </section>
          ))
        ) : (
          <EmptyState
            title={filtrando ? 'Nenhum produto encontrado' : 'Nenhuma categoria cadastrada'}
            description={
              filtrando
                ? 'Tente outra busca ou outro setor.'
                : 'Crie a primeira categoria para começar a montar o cardápio.'
            }
            action={
              !filtrando && (
                <Button variant="strong" onClick={() => setModalCategoria({})}>
                  Nova categoria
                </Button>
              )
            }
          />
        )
      ) : produtosVisiveis.length ? (
        listaProdutos(produtosVisiveis)
      ) : filtrando ? (
        <EmptyState title="Nenhum produto encontrado" description="Tente outra busca ou outro setor." />
      ) : (
        semProdutos
      )}

      {modalProduto && (
        <ProdutoFormModal
          produto={modalProduto.produto}
          categorias={categorias}
          categoriaInicial={categoriaAtiva === TODOS ? '' : categoriaAtiva}
          onSalvar={salvarProduto}
          onFechar={() => setModalProduto(null)}
        />
      )}

      {modalCategoria && (
        <CategoriaFormModal
          categoria={modalCategoria.categoria}
          onSalvar={salvarCategoria}
          onFechar={() => setModalCategoria(null)}
        />
      )}

      <ConfirmDialog
        open={confirmacao?.tipo === 'produto'}
        title={`Remover “${confirmacao?.item?.nome ?? ''}”?`}
        message="O produto sai do cardápio, mas o histórico de vendas é mantido."
        confirmLabel="Remover produto"
        loading={removendo}
        onConfirm={removerProduto}
        onCancel={() => setConfirmacao(null)}
      />

      <ConfirmDialog
        open={confirmacao?.tipo === 'categoria'}
        title={`Remover a categoria “${confirmacao?.item?.nome ?? ''}”?`}
        message="A categoria sai do cardápio. Só é possível remover se não houver produtos ativos nela."
        confirmLabel="Remover categoria"
        loading={removendo}
        onConfirm={removerCategoria}
        onCancel={() => setConfirmacao(null)}
      />
    </AdminLayout>
  );
}
