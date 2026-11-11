import { Button, Modal } from '../ui';
import { cn } from '../../lib/cn';
import { ESTILO_SITUACAO } from './estilos';

const LEGENDA = [
  { chave: 'novo', texto: 'Acabou de chegar e ainda não começou a ser preparado.' },
  { chave: 'preparo', texto: 'Alguém já iniciou o preparo.' },
  { chave: 'pronto', texto: 'Pronto para ser entregue na mesa.' },
  { chave: 'atrasado', texto: 'Passou do tempo esperado de preparo e ainda não ficou pronto.' },
];

// Ajuda ("?") das telas de Cozinha e Bar: o que cada cor quer dizer e como o prazo é contado.
export default function KdsAjudaModal({ aberto, onFechar }) {
  return (
    <Modal
      open={aberto}
      onClose={onFechar}
      title="Como ler os pedidos"
      size="sm"
      footer={<Button onClick={onFechar}>Entendi</Button>}
    >
      <ul className="space-y-4">
        {LEGENDA.map(({ chave, texto }) => (
          <li key={chave} className="flex gap-3">
            <span className={cn('mt-0.5 h-5 w-1.5 shrink-0 rounded-full bg-current', ESTILO_SITUACAO[chave].texto)} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{ESTILO_SITUACAO[chave].rotulo}</p>
              <p className="text-sm text-ink-soft">{texto}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-line pt-4 text-sm text-ink-soft">
        O tempo conta desde o lançamento do item mais antigo do pedido. O prazo é o maior tempo de
        preparo cadastrado entre os itens (20 minutos quando nenhum tem). Ao chegar a 70% do prazo,
        o tempo fica amarelo; passando dele, o pedido vira atrasado. Os mais antigos aparecem primeiro.
      </p>
    </Modal>
  );
}
