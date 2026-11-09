import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/layout/PageHeader';
import FuncionarioFormModal from '../../components/funcionarios/FuncionarioFormModal';
import { Badge, Button, ConfirmDialog, EmptyState, IconEdit, IconPlus, Spinner } from '../../components/ui';
import api from '../../api/axiosClient';
import { PERFIS } from '../../schemas/funcionario.schema';
import { toast } from '../../store/toastStore';
import { mensagemErro } from '../../utils/erroApi';
import { cn } from '../../lib/cn';

const rotuloPerfil = (valor) => PERFIS.find((p) => p.valor === valor)?.rotulo ?? valor;

const formatarCpf = (cpf = '') =>
  cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;

// RF02 - Gestão de Colaboradores e Autenticação
export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [mostrarDesligados, setMostrarDesligados] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  // null = fechado | {} = novo | {_id,...} = editando
  const [editando, setEditando] = useState(null);
  const [aDesligar, setADesligar] = useState(null);
  const [desligando, setDesligando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/funcionarios', {
        params: { ativo: mostrarDesligados ? 'todos' : 'true' },
      });
      setFuncionarios(data);
      setErroLista('');
    } catch (err) {
      setErroLista(mensagemErro(err, 'Não foi possível carregar os funcionários.'));
    } finally {
      setCarregando(false);
    }
  }, [mostrarDesligados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const desligar = async () => {
    const f = aDesligar;
    setDesligando(true);
    try {
      await api.delete(`/funcionarios/${f._id}`);
      toast.success('Funcionário desligado', f.nome);
      carregar();
    } catch (err) {
      toast.error('Não foi possível desligar o funcionário', mensagemErro(err, 'Tente de novo.'));
    } finally {
      setDesligando(false);
      setADesligar(null);
    }
  };

  const reativar = async (f) => {
    try {
      await api.patch(`/funcionarios/${f._id}/reativar`);
      toast.success('Funcionário reativado', f.nome);
      carregar();
    } catch (err) {
      toast.error('Não foi possível reativar o funcionário', mensagemErro(err, 'Tente de novo.'));
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        titulo="Funcionários"
        descricao="Gerencie sua equipe, funções e acessos ao sistema"
        acoes={
          <Button leftIcon={<IconPlus className="h-4 w-4" />} onClick={() => setEditando({})}>
            Adicionar funcionário
          </Button>
        }
      />

      <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={mostrarDesligados}
          onChange={(e) => setMostrarDesligados(e.target.checked)}
          className="h-4 w-4 accent-[#f36115]"
        />
        Mostrar desligados
      </label>

      {carregando ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Spinner label="Carregando" /> Carregando funcionários...
        </p>
      ) : erroLista ? (
        <EmptyState
          title="Não foi possível carregar"
          description={erroLista}
          action={
            <Button variant="strong" onClick={carregar}>
              Tentar de novo
            </Button>
          }
        />
      ) : funcionarios.length === 0 ? (
        <EmptyState
          title="Nenhum funcionário encontrado"
          description="Adicione a primeira pessoa da equipe para liberar o acesso ao sistema."
          action={
            <Button variant="strong" onClick={() => setEditando({})}>
              Adicionar funcionário
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Funcionários cadastrados</caption>
            <thead className="bg-tile text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Nome do funcionário</th>
                <th scope="col" className="px-4 py-3">CPF</th>
                <th scope="col" className="px-4 py-3">Cargo</th>
                <th scope="col" className="px-4 py-3">Especialidade</th>
                <th scope="col" className="px-4 py-3 text-right">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {funcionarios.map((f) => (
                <tr key={f._id} className="transition hover:bg-muted">
                  <td className={cn('px-4 py-3 font-semibold', !f.ativo && 'text-ink-faint')}>
                    {f.nome}
                    {!f.ativo && (
                      <Badge tone="neutral" dot={false} className="ml-2 align-middle">
                        Desligado
                      </Badge>
                    )}
                  </td>
                  <td className={cn('px-4 py-3', f.ativo ? 'text-ink-soft' : 'text-ink-faint')}>
                    {formatarCpf(f.cpf)}
                  </td>
                  <td className={cn('px-4 py-3', f.ativo ? 'text-ink-soft' : 'text-ink-faint')}>
                    {rotuloPerfil(f.perfil)}
                  </td>
                  <td className={cn('px-4 py-3', f.ativo ? 'text-ink-soft' : 'text-ink-faint')}>
                    {f.especialidade || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {f.ativo ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Editar ${f.nome}`}
                            title="Editar"
                            onClick={() => setEditando(f)}
                          >
                            <IconEdit className="h-4 w-4" />
                          </Button>
                          <Button variant="strong" size="sm" onClick={() => setADesligar(f)}>
                            Desligar
                          </Button>
                        </>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => reativar(f)}>
                          Reativar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <FuncionarioFormModal
          funcionario={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(nome) => {
            toast.success(editando._id ? 'Funcionário atualizado' : 'Funcionário adicionado', nome);
            setEditando(null);
            carregar();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(aDesligar)}
        title={`Desligar ${aDesligar?.nome ?? ''}?`}
        message="Ele perde o acesso ao sistema. Você pode reativá-lo depois em “Mostrar desligados”."
        confirmLabel="Desligar funcionário"
        loading={desligando}
        onConfirm={desligar}
        onCancel={() => setADesligar(null)}
      />
    </AdminLayout>
  );
}
