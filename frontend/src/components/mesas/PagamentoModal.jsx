import { useRef, useState } from 'react';
import { Button, IconPlus, IconTrash, Input, Modal, Select } from '../ui';
import { arredondar } from '../../utils/comanda';
import { dinheiro, dinheiroCampo, lerDinheiro } from '../../utils/dinheiro';
import { mensagemErro } from '../../utils/erroApi';

const METODOS = [
  { tipo: 'dinheiro', rotulo: 'Dinheiro' },
  { tipo: 'pix', rotulo: 'Pix' },
  { tipo: 'cartao', rotulo: 'Cartão' },
];
const MAX_METODOS = 5; // limite do backend (fecharPagamentoSchema)

// Mesmas regras do backend: valor positivo, até 999.999 e no máximo 2 casas decimais.
function valorValido(valor) {
  return (
    Number.isFinite(valor) &&
    valor > 0 &&
    valor <= 999999 &&
    Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6
  );
}

/**
 * Recebimento (RF11): uma ou mais formas de pagamento até cobrir o total; o que passar
 * do total vira troco. `onConfirmar(metodos)` devolve uma Promise; se falhar, a mensagem
 * aparece aqui dentro. Monte só quando for abrir, para começar limpo.
 */
export default function PagamentoModal({ titulo, descricao, total, onConfirmar, onFechar }) {
  const proximoId = useRef(1);
  const [linhas, setLinhas] = useState([{ id: 0, tipo: 'dinheiro', valor: dinheiroCampo(total) }]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const valores = linhas.map((l) => lerDinheiro(l.valor));
  const todosValidos = valores.every(valorValido);
  const recebido = arredondar(valores.filter(Number.isFinite).reduce((soma, v) => soma + v, 0));
  const falta = arredondar(Math.max(0, total - recebido));
  const troco = arredondar(Math.max(0, recebido - total));
  const podeConfirmar = todosValidos && falta === 0 && !enviando;

  const alterar = (id, campos) =>
    setLinhas((atual) => atual.map((l) => (l.id === id ? { ...l, ...campos } : l)));

  function adicionarLinha() {
    const id = proximoId.current++;
    setLinhas((atual) => [...atual, { id, tipo: 'pix', valor: falta > 0 ? dinheiroCampo(falta) : '' }]);
  }

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await onConfirmar(linhas.map((l, i) => ({ tipo: l.tipo, valor: valores[i] })));
    } catch (err) {
      setErro(mensagemErro(err, 'Não foi possível concluir o pagamento. Tente de novo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? undefined : onFechar}
      closeOnOverlay={!enviando}
      title={titulo}
      description={descricao}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} loading={enviando} disabled={!podeConfirmar}>
            Confirmar pagamento
          </Button>
        </>
      }
    >
      <div className="flex items-baseline justify-between rounded-md bg-muted px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Total a receber</span>
        <span className="font-display text-2xl tabular-nums">{dinheiro(total)}</span>
      </div>

      <ul className="mt-4 space-y-2">
        {linhas.map((linha, i) => (
          <li key={linha.id} className="grid grid-cols-[8rem_1fr_auto] items-start gap-2">
            <Select
              aria-label={`Forma de pagamento ${i + 1}`}
              value={linha.tipo}
              onChange={(e) => alterar(linha.id, { tipo: e.target.value })}
            >
              {METODOS.map((m) => (
                <option key={m.tipo} value={m.tipo}>
                  {m.rotulo}
                </option>
              ))}
            </Select>
            <Input
              data-autofocus={i === 0 ? true : undefined}
              aria-label={`Valor recebido ${i + 1}`}
              inputMode="decimal"
              value={linha.valor}
              onChange={(e) => alterar(linha.id, { valor: e.target.value })}
              error={linha.valor !== '' && !valorValido(valores[i]) ? 'Valor inválido.' : undefined}
              placeholder="0,00"
            />
            {linhas.length > 1 ? (
              <button
                type="button"
                onClick={() => setLinhas((atual) => atual.filter((l) => l.id !== linha.id))}
                aria-label={`Remover forma de pagamento ${i + 1}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-soft transition hover:bg-muted hover:text-danger-ink"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            ) : (
              <span className="w-10" />
            )}
          </li>
        ))}
      </ul>

      {linhas.length < MAX_METODOS && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          leftIcon={<IconPlus className="h-4 w-4" />}
          onClick={adicionarLinha}
        >
          Dividir em outra forma de pagamento
        </Button>
      )}

      <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Recebido</dt>
          <dd className="tabular-nums">{dinheiro(recebido)}</dd>
        </div>
        {falta > 0 ? (
          <div className="flex justify-between font-semibold text-danger-ink">
            <dt>Falta</dt>
            <dd className="tabular-nums">{dinheiro(falta)}</dd>
          </div>
        ) : (
          <div className="flex justify-between font-semibold text-ok-ink">
            <dt>Troco</dt>
            <dd className="tabular-nums">{dinheiro(troco)}</dd>
          </div>
        )}
      </dl>

      {erro && (
        <p role="alert" className="mt-3 text-sm text-danger-ink">
          {erro}
        </p>
      )}
    </Modal>
  );
}
