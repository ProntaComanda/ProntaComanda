import { useState } from 'react';
import { Button, Input, Modal } from '../ui';
import { mensagemErro } from '../../utils/erroApi';

/**
 * Criar/editar categoria. Monte só quando for abrir, para começar limpo.
 * `onSalvar(nome)` devolve uma Promise; se falhar, a mensagem aparece no formulário.
 */
export default function CategoriaFormModal({ categoria, onSalvar, onFechar }) {
  const editando = Boolean(categoria);
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();
    const limpo = nome.trim();
    if (limpo.length < 2) return setErro('O nome deve ter ao menos 2 caracteres.');
    if (limpo.length > 40) return setErro('O nome deve ter no máximo 40 caracteres.');

    setErro('');
    setEnviando(true);
    try {
      await onSalvar(limpo);
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível salvar a categoria. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      title={editando ? 'Editar categoria' : 'Nova categoria'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" form="form-categoria" loading={enviando}>
            {editando ? 'Salvar categoria' : 'Criar categoria'}
          </Button>
        </>
      }
    >
      <form id="form-categoria" onSubmit={aoEnviar} noValidate>
        <Input
          data-autofocus
          label="Nome da categoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
          error={erro}
          placeholder="Ex.: Sobremesas"
        />
      </form>
    </Modal>
  );
}
