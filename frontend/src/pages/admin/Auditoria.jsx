import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import { Badge, Button, EmptyState, IconClipboard, Input, Select, Spinner } from '../../components/ui';
import api from '../../api/axiosClient';
import { cn } from '../../lib/cn';
import { PERFIS } from '../../schemas/funcionario.schema';
import { resumirRegistro, rotuloAcao, tomAcao } from '../../utils/auditoria';
import { mensagemErro } from '../../utils/erroApi';
import { inteiro } from '../../utils/numero';

const FILTROS_VAZIOS = { tipo: '', funcionario: '', de: '', ate: '' };

const rotuloPerfil = (valor) => PERFIS.find((p) => p.valor === valor)?.rotulo ?? valor;

// RF17 - relatórios de auditoria (somente leitura)
export default function Auditoria() {
  const [tipos, setTipos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null); // null = primeira carga
  const [buscando, setBuscando] = useState(false); // trocando de página ou de filtro
  const [erro, setErro] = useState('');
  const ultimaBusca = useRef(0);

  // opções dos filtros: carregadas uma vez. Se falharem, o filtro só fica sem opções.
  useEffect(() => {
    api
      .get('/auditoria/tipos')
      .then((r) => setTipos(r.data))
      .catch(() => {});
    api
      .get('/funcionarios', { params: { ativo: 'todos' } })
      .then((r) => setFuncionarios(r.data))
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    // só manda o que foi preenchido (o backend recusa string vazia em data/id)
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    const minhaBusca = ++ultimaBusca.current;
    setBuscando(true);
    try {
      const { data } = await api.get('/auditoria', { params: { ...params, pagina } });
      if (minhaBusca !== ultimaBusca.current) return; // chegou uma resposta mais nova: descarta esta
      setDados(data);
      setErro('');
    } catch (err) {
      if (minhaBusca !== ultimaBusca.current) return;
      setErro(mensagemErro(err, 'Não foi possível carregar a auditoria.'));
    } finally {
      if (minhaBusca === ultimaBusca.current) setBuscando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alterarFiltro = (campo, valor) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
    setPagina(1); // filtro novo sempre volta para a primeira página
  };

  const limparFiltros = () => {
    setFiltros(FILTROS_VAZIOS);
    setPagina(1);
  };

  const comFiltro = Object.values(filtros).some(Boolean);

  return (
    <AdminLayout>
      <PageHeader
        titulo="Auditoria"
        descricao="Registro das ações sensíveis feitas no sistema: estornos, descontos, reaberturas, ajustes de estoque e mudanças de equipe e de preços"
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4">
        <Select
          className="w-52"
          label="Ação"
          value={filtros.tipo}
          onChange={(e) => alterarFiltro('tipo', e.target.value)}
        >
          <option value="">Todas</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {rotuloAcao(t)}
            </option>
          ))}
        </Select>

        <Select
          className="w-52"
          label="Funcionário"
          value={filtros.funcionario}
          onChange={(e) => alterarFiltro('funcionario', e.target.value)}
        >
          <option value="">Todos</option>
          {funcionarios.map((f) => (
            <option key={f._id} value={f._id}>
              {f.nome}
            </option>
          ))}
        </Select>

        {/* min/max impedem escolher uma data inicial depois da final (o backend recusaria) */}
        <Input
          className="w-40"
          type="date"
          label="De"
          value={filtros.de}
          max={filtros.ate || undefined}
          onChange={(e) => alterarFiltro('de', e.target.value)}
        />
        <Input
          className="w-40"
          type="date"
          label="Até"
          value={filtros.ate}
          min={filtros.de || undefined}
          onChange={(e) => alterarFiltro('ate', e.target.value)}
        />

        {comFiltro && (
          <Button variant="ghost" onClick={limparFiltros}>
            Limpar filtros
          </Button>
        )}
      </div>

      {dados === null && !erro ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner label="Carregando" /> Carregando registros...
        </p>
      ) : dados === null ? (
        <EmptyState
          title="Não foi possível carregar"
          description={erro}
          action={
            <Button variant="strong" onClick={carregar}>
              Tentar de novo
            </Button>
          }
        />
      ) : (
        <>
          {erro && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-md bg-danger-soft px-4 py-2 text-sm text-danger-ink"
            >
              <span>{erro}</span>
              <Button variant="secondary" size="sm" onClick={carregar}>
                Tentar de novo
              </Button>
            </div>
          )}

          {dados.itens.length === 0 ? (
            <EmptyState
              icon={<IconClipboard className="h-10 w-10" />}
              title="Nenhum registro encontrado"
              description={
                comFiltro
                  ? 'Nenhuma ação bate com esses filtros. Tente ampliar o período ou limpar os filtros.'
                  : 'As ações sensíveis feitas no sistema aparecem aqui.'
              }
              action={
                comFiltro && (
                  <Button variant="strong" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <div
              className={cn(
                'overflow-x-auto rounded-lg border border-line bg-surface transition-opacity',
                buscando && 'opacity-60'
              )}
              aria-busy={buscando}
            >
              <table className="w-full min-w-[48rem] text-left text-sm">
                <caption className="sr-only">Registros de auditoria</caption>
                <thead className="bg-tile text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="px-4 py-3">Data e hora</th>
                    <th scope="col" className="px-4 py-3">Quem</th>
                    <th scope="col" className="px-4 py-3">Ação</th>
                    <th scope="col" className="px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dados.itens.map((registro) => {
                    const quando = new Date(registro.createdAt);
                    return (
                      <tr key={registro._id} className="align-top transition hover:bg-muted">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                          <p className="font-medium">{quando.toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs text-ink-soft">{quando.toLocaleTimeString('pt-BR')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{registro.funcionario?.nome ?? 'Sistema'}</p>
                          {registro.funcionario?.perfil && (
                            <p className="text-xs text-ink-soft">{rotuloPerfil(registro.funcionario.perfil)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={tomAcao(registro.tipo)} dot={false} className="whitespace-nowrap">
                            {rotuloAcao(registro.tipo)}
                          </Badge>
                        </td>
                        <td className="max-w-xl px-4 py-3 text-ink-soft">
                          {resumirRegistro(registro.tipo, registro.detalhes)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
            <span>
              {inteiro(dados.total)} registro(s) · página {pagina} de {dados.totalPaginas}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagina((p) => p - 1)}
                disabled={pagina <= 1 || buscando}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPagina((p) => p + 1)}
                disabled={pagina >= dados.totalPaginas || buscando}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
