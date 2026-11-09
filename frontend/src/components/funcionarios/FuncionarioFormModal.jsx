import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axiosClient';
import { funcionarioSchema, PERFIS } from '../../schemas/funcionario.schema';
import { Button, Input, Modal, Select } from '../ui';

const VAZIO = {
  nome: '',
  cpf: '',
  perfil: '',
  especialidade: '',
  telefone: '',
  email: '',
  senha: '',
};

/**
 * RF02 - Criar/editar funcionário. Monte só quando for abrir
 * (`{editando && <FuncionarioFormModal .../>}`) para o formulário começar limpo.
 * `funcionario` = {} para novo, ou o funcionário para editar.
 */
export default function FuncionarioFormModal({ funcionario, onFechar, onSalvo }) {
  const modo = funcionario._id ? 'editar' : 'criar';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(funcionarioSchema(modo)),
    defaultValues: {
      ...VAZIO,
      nome: funcionario.nome ?? '',
      cpf: funcionario.cpf ?? '',
      perfil: funcionario.perfil ?? '',
      especialidade: funcionario.especialidade ?? '',
      telefone: funcionario.telefone ?? '',
      email: funcionario.email ?? '',
    },
  });

  const onSubmit = async (dados) => {
    const corpo = { ...dados };
    // Em edição, senha vazia = manter a atual (não envia o campo).
    if (modo === 'editar' && !corpo.senha) delete corpo.senha;

    try {
      if (modo === 'criar') await api.post('/funcionarios', corpo);
      else await api.put(`/funcionarios/${funcionario._id}`, corpo);
      onSalvo(corpo.nome);
    } catch (err) {
      const resp = err.response?.data;
      // 400 do backend: { detalhes: { campo: [mensagens] } }
      if (resp?.detalhes) {
        Object.entries(resp.detalhes).forEach(([campo, msgs]) => setError(campo, { message: msgs[0] }));
      }
      // 409 (CPF/e-mail duplicado): { erro, campo }
      else if (resp?.campo) {
        setError(resp.campo, { message: resp.erro });
      } else {
        setError('root', { message: resp?.erro || 'Não foi possível salvar o funcionário. Tente de novo.' });
      }
    }
  };

  return (
    <Modal
      open
      onClose={isSubmitting ? undefined : onFechar}
      closeOnOverlay={false}
      title={modo === 'criar' ? 'Novo funcionário' : 'Editar funcionário'}
      description={modo === 'criar' ? 'Defina o cargo e a senha de acesso.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-funcionario" loading={isSubmitting}>
            {modo === 'criar' ? 'Adicionar funcionário' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <form id="form-funcionario" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input data-autofocus label="Nome completo" error={errors.nome?.message} {...register('nome')} />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CPF"
            inputMode="numeric"
            placeholder="000.000.000-00"
            error={errors.cpf?.message}
            {...register('cpf')}
          />
          <Select label="Cargo" error={errors.perfil?.message} {...register('perfil')}>
            <option value="">Selecione…</option>
            {PERFIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Especialidade"
          hint="Opcional"
          error={errors.especialidade?.message}
          {...register('especialidade')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Telefone"
            hint="Opcional"
            inputMode="tel"
            placeholder="(14) 99999-9999"
            error={errors.telefone?.message}
            {...register('telefone')}
          />
          <Input
            label="E-mail"
            hint="Opcional"
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Input
          type="password"
          autoComplete="new-password"
          label={modo === 'criar' ? 'Senha' : 'Nova senha'}
          hint={modo === 'criar' ? 'Mínimo de 6 caracteres' : 'Deixe vazio para manter a atual'}
          error={errors.senha?.message}
          {...register('senha')}
        />

        {errors.root && (
          <p role="alert" className="text-sm text-danger-ink">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
