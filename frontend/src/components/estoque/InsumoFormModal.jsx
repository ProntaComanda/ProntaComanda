import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axiosClient';
import { insumoSchema, UNIDADES } from '../../schemas/estoque.schema';
import { Button, Input, Modal, Select } from '../ui';
import { lerNumero, numeroCampo } from '../../utils/numero';

/**
 * RF10 - Cadastrar/editar insumo. Monte só quando for abrir
 * (`{formInsumo && <InsumoFormModal .../>}`) para o formulário começar limpo.
 * `insumo` = {} para novo, ou o insumo para editar.
 *
 * Na edição a unidade fica travada: trocar de "kg" para "g" sem converter o saldo
 * deixaria o estoque errado. E o saldo só muda por movimentação (entrada, saída, ajuste).
 */
export default function InsumoFormModal({ insumo, onFechar, onSalvo }) {
  const modo = insumo._id ? 'editar' : 'criar';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(insumoSchema(modo)),
    defaultValues: {
      nome: insumo.nome ?? '',
      unidade: insumo.unidade ?? 'un',
      saldoAtual: '0',
      saldoMinimo: numeroCampo(insumo.saldoMinimo ?? 0),
    },
  });

  const onSubmit = async (dados) => {
    try {
      if (modo === 'criar') {
        await api.post('/estoque', {
          nome: dados.nome,
          unidade: dados.unidade,
          saldoAtual: lerNumero(dados.saldoAtual),
          saldoMinimo: lerNumero(dados.saldoMinimo),
        });
      } else {
        await api.put(`/estoque/${insumo._id}`, { nome: dados.nome, saldoMinimo: lerNumero(dados.saldoMinimo) });
      }
      onSalvo(dados.nome);
    } catch (err) {
      const resp = err.response?.data;
      // 400 do backend: { detalhes: { campo: [mensagens] } }
      if (resp?.detalhes) {
        Object.entries(resp.detalhes).forEach(([campo, msgs]) => setError(campo, { message: msgs[0] }));
      }
      // 409: já existe um insumo com esse nome
      else if (err.response?.status === 409) {
        setError('nome', { message: resp?.erro || 'Já existe um insumo com este nome.' });
      } else {
        setError('root', { message: resp?.erro || 'Não foi possível salvar o insumo. Tente de novo.' });
      }
    }
  };

  return (
    <Modal
      open
      onClose={isSubmitting ? undefined : onFechar}
      closeOnOverlay={false}
      title={modo === 'criar' ? 'Novo insumo' : 'Editar insumo'}
      description={
        modo === 'criar'
          ? 'O saldo mínimo dispara o alerta de reposição quando o estoque ficar abaixo dele.'
          : 'Para mudar o saldo, registre uma entrada, saída ou ajuste.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-insumo" loading={isSubmitting}>
            {modo === 'criar' ? 'Adicionar insumo' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <form id="form-insumo" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          data-autofocus
          label="Nome do insumo"
          placeholder="Ex.: Pão de hambúrguer"
          error={errors.nome?.message}
          {...register('nome')}
        />

        <div className={modo === 'criar' ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-2 gap-4'}>
          <Select
            label="Unidade"
            disabled={modo === 'editar'}
            hint={modo === 'editar' ? 'Não pode ser alterada' : undefined}
            error={errors.unidade?.message}
            {...register('unidade')}
          >
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </Select>

          {modo === 'criar' && (
            <Input
              label="Saldo inicial"
              inputMode="decimal"
              error={errors.saldoAtual?.message}
              {...register('saldoAtual')}
            />
          )}

          <Input
            label="Saldo mínimo"
            inputMode="decimal"
            error={errors.saldoMinimo?.message}
            {...register('saldoMinimo')}
          />
        </div>

        {errors.root && (
          <p role="alert" className="text-sm text-danger-ink">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
