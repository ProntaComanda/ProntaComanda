import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api/axiosClient';
import { movimentacaoSchema } from '../../schemas/estoque.schema';
import { Button, Input, Modal, Textarea } from '../ui';
import { arredondar, formatarQuantidade, saldoDepois } from '../../utils/estoque';
import { lerNumero } from '../../utils/numero';

const CONFIG = {
  entrada: {
    titulo: 'Entrada de estoque',
    descricao: 'Reposição, compra ou devolução. A quantidade é somada ao saldo.',
    botao: 'Registrar entrada',
    motivo: { label: 'Observação (opcional)', placeholder: 'Ex.: Compra do fornecedor' },
  },
  saida: {
    titulo: 'Saída de estoque',
    descricao: 'Perda, quebra ou uso fora do sistema. A quantidade é tirada do saldo.',
    botao: 'Registrar saída',
    motivo: { label: 'Observação (opcional)', placeholder: 'Ex.: Validade vencida' },
  },
  ajuste: {
    titulo: 'Ajuste de saldo',
    descricao:
      'Correção de inventário: informe o saldo que você contou. O sistema ajusta a diferença, para mais ou para menos, e guarda o motivo.',
    botao: 'Registrar ajuste',
    campo: 'Saldo contado',
    motivo: { label: 'Motivo do ajuste', placeholder: 'Ex.: Contagem do inventário' },
  },
};

/**
 * RF10 - Entrada, saída ou ajuste de um insumo (`tipo`). Mostra o saldo que vai ficar antes de
 * confirmar, igual ao cálculo do backend. Entrada e saída informam a quantidade; o ajuste informa
 * o saldo contado. Monte só quando for abrir.
 * `onSalvo(insumoAtualizado)` é chamado depois de registrar.
 */
export default function MovimentarEstoqueModal({ insumo, tipo, onFechar, onSalvo }) {
  const config = CONFIG[tipo];

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(movimentacaoSchema(tipo)),
    defaultValues: { quantidade: '', motivo: '' },
  });

  // saldo com resto de conta antiga (5e-17) conta como zero, igual ao backend
  const saldoAtual = arredondar(insumo.saldoAtual);
  // no ajuste o campo é o saldo contado, e contar zero é válido
  const valor = lerNumero(watch('quantidade'));
  const valorValido = Number.isFinite(valor) && (tipo === 'ajuste' ? valor >= 0 : valor > 0) && valor <= 999999;
  const depois = valorValido ? saldoDepois(tipo, saldoAtual, valor) : null;
  const diferenca = tipo === 'ajuste' && depois !== null ? arredondar(depois - saldoAtual) : null;

  const onSubmit = async (dados) => {
    try {
      const corpo =
        tipo === 'ajuste'
          ? { tipo, saldoContado: lerNumero(dados.quantidade), motivo: dados.motivo }
          : { tipo, quantidade: lerNumero(dados.quantidade), motivo: dados.motivo || undefined };
      const { data } = await api.post(`/estoque/${insumo._id}/movimentar`, corpo);
      onSalvo(data);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.detalhes) {
        // no ajuste, o campo "saldoContado" do backend é o campo "quantidade" do formulário
        Object.entries(resp.detalhes).forEach(([campo, msgs]) =>
          setError(campo === 'saldoContado' ? 'quantidade' : campo, { message: msgs[0] })
        );
      } else {
        setError('root', { message: resp?.erro || 'Não foi possível registrar a movimentação. Tente de novo.' });
      }
    }
  };

  // Avisos sobre o efeito da movimentação (RF22: saldo zerado tira os produtos do cardápio)
  const avisos = [];
  if (depois !== null) {
    if (tipo === 'saida' && valor > saldoAtual) {
      avisos.push({ tom: 'warn', texto: 'A saída é maior que o saldo atual; o saldo ficará em 0.' });
    }
    if (diferenca === 0) {
      avisos.push({ tom: 'warn', texto: 'O saldo contado é igual ao saldo atual: não há o que ajustar.' });
    }
    if (depois === 0 && saldoAtual > 0) {
      avisos.push({
        tom: 'warn',
        texto: 'Com o saldo zerado, os produtos que usam este insumo ficam indisponíveis no cardápio.',
      });
    }
    if (saldoAtual === 0 && depois > 0) {
      avisos.push({
        tom: 'ok',
        texto: 'Com a reposição, os produtos que usam este insumo voltam a ficar disponíveis.',
      });
    }
  }

  return (
    <Modal
      open
      onClose={isSubmitting ? undefined : onFechar}
      closeOnOverlay={false}
      title={config.titulo}
      description={config.descricao}
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="form-movimentacao" loading={isSubmitting}>
            {config.botao}
          </Button>
        </>
      }
    >
      <form id="form-movimentacao" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm font-semibold">{insumo.nome}</p>

        <Input
          data-autofocus
          label={`${config.campo ?? 'Quantidade'} (${insumo.unidade})`}
          inputMode="decimal"
          placeholder="0"
          error={errors.quantidade?.message}
          {...register('quantidade')}
        />

        <Textarea
          label={config.motivo.label}
          rows={2}
          maxLength={200}
          placeholder={config.motivo.placeholder}
          error={errors.motivo?.message}
          {...register('motivo')}
        />

        <div className="rounded-md bg-muted px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-soft">Saldo atual</span>
            <span className="tabular-nums">
              {formatarQuantidade(saldoAtual)} {insumo.unidade}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between font-semibold">
            <span>Saldo depois</span>
            <span className="tabular-nums">
              {depois === null ? '—' : `${formatarQuantidade(depois)} ${insumo.unidade}`}
            </span>
          </div>
          {diferenca !== null && diferenca !== 0 && (
            <div
              className={`mt-1 flex items-baseline justify-between text-xs ${diferenca > 0 ? 'text-ok-ink' : 'text-danger-ink'}`}
            >
              <span>Diferença</span>
              <span className="tabular-nums">
                {diferenca > 0 ? '+' : '\u2212'}
                {formatarQuantidade(Math.abs(diferenca))} {insumo.unidade}
              </span>
            </div>
          )}
        </div>

        {avisos.map((aviso) => (
          <p key={aviso.texto} className={`text-xs ${aviso.tom === 'ok' ? 'text-ok-ink' : 'text-warn-ink'}`}>
            {aviso.texto}
          </p>
        ))}

        {errors.root && (
          <p role="alert" className="text-sm text-danger-ink">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
