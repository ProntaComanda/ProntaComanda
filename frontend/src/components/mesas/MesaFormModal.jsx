import { useState } from 'react';
import { Button, Input, Modal } from '../ui';
import { mensagemErro } from '../../utils/erroApi';

/**
 * Cadastro de mesa (botão "+ Adicionar Mesa"). O número é único entre as mesas ativas;
 * se já existir, o backend recusa e a mensagem aparece no campo. Monte só quando for abrir.
 */
export default function MesaFormModal({ numeroSugerido, onSalvar, onFechar }) {
  const [numero, setNumero] = useState(String(numeroSugerido));
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    const valor = Number(numero);
    if (!Number.isInteger(valor) || valor <= 0) return setErro('Informe um número inteiro maior que zero.');
    if (valor > 999) return setErro('O número da mesa pode ir até 999.');

    setErro('');
    setEnviando(true);
    try {
      await onSalvar(valor);
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível adicionar a mesa. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      title="Adicionar mesa"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-mesa" loading={enviando}>
            Adicionar mesa
          </Button>
        </>
      }
    >
      <form id="form-mesa" onSubmit={aoEnviar} noValidate>
        <Input
          data-autofocus
          label="Número da mesa"
          inputMode="numeric"
          maxLength={3}
          value={numero}
          onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
          error={erro}
        />
      </form>
    </Modal>
  );
}
