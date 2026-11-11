import { useState } from 'react';
import { Button, Modal, Textarea } from '../ui';
import { dinheiro } from '../../utils/dinheiro';
import { mensagemErro } from '../../utils/erroApi';

/**
 * Estorno de item (RF07/RF08): o motivo é obrigatório e vira registro de auditoria.
 * `onConfirmar(motivo)` devolve uma Promise; se falhar, a mensagem aparece no modal.
 * Monte só quando for abrir, para começar limpo.
 */
export default function EstornoModal({ item, onConfirmar, onFechar }) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    const limpo = motivo.trim();
    if (limpo.length < 3) return setErro('Descreva o motivo do estorno (mínimo de 3 caracteres).');

    setErro('');
    setEnviando(true);
    try {
      await onConfirmar(limpo);
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível estornar o item. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      title="Estornar item"
      description={`${item.quantidade}× ${item.nome} · ${dinheiro(item.valor)} saem da conta.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-estorno" variant="danger" loading={enviando}>
            Estornar item
          </Button>
        </>
      }
    >
      <form id="form-estorno" onSubmit={aoEnviar} noValidate>
        <Textarea
          data-autofocus
          label="Motivo do estorno"
          rows={3}
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          error={erro}
          placeholder="Ex.: Cliente desistiu, item veio errado"
        />
      </form>
    </Modal>
  );
}
