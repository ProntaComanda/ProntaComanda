import { useState } from 'react';
import {
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  IconSearch,
  Input,
  Modal,
  Spinner,
  Textarea,
  ThemeToggle,
} from '../../components/ui';
import { toast } from '../../store/toastStore';

// Vitrine dos componentes base, só em desenvolvimento: abra /ui-kit.
// Serve para conferir cada componente contra o protótipo nos temas claro e escuro.
function Secao({ titulo, children }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="mb-4 font-display text-lg">{titulo}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

export default function UiKit() {
  const [modal, setModal] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [filtro, setFiltro] = useState('Todos');

  function remover() {
    setRemovendo(true);
    setTimeout(() => {
      setRemovendo(false);
      setConfirmar(false);
      toast.success('Funcionário removido');
    }, 800);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Componentes base</h1>
          <p className="text-sm text-ink-soft">Pronta Comanda · conferir contra o protótipo</p>
        </div>
        <ThemeToggle />
      </header>

      <Secao titulo="Botões">
        <Button>Entrar</Button>
        <Button variant="solid" leftIcon={<IconSearch className="h-4 w-4" />}>
          Adicionar
        </Button>
        <Button variant="strong">Adicionar Mesa</Button>
        <Button variant="danger">Remover</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Ver detalhes</Button>
        <Button loading>Salvando</Button>
        <Button disabled>Indisponível</Button>
        <Button size="sm">Pequeno</Button>
        <Button size="lg">Finalizar pedido</Button>
      </Secao>

      <Secao titulo="Campos">
        <Input label="Nome do usuário" placeholder="Admin" className="w-64" />
        <Input label="Buscar" leftIcon={<IconSearch className="h-4 w-4" />} placeholder="Buscar item, categoria..." className="w-64" />
        <Input label="CPF" defaultValue="123" error="Digite os 11 números do CPF." className="w-64" />
        <Textarea label="Observação (opcional)" placeholder="Ex.: sem cebola" className="w-64" />
      </Secao>

      <Secao titulo="Status e filtros">
        <Badge tone="ok">Disponível</Badge>
        <Badge tone="danger">Indisponível</Badge>
        <Badge tone="warning">Estoque baixo</Badge>
        <Badge tone="info">Novo</Badge>
        <Badge tone="neutral" dot={false}>
          Neutro
        </Badge>
        {['Todos', 'Principais', 'Sobremesas', 'Bebidas'].map((nome, i) => (
          <Chip key={nome} active={filtro === nome} count={i === 0 ? 12 : undefined} onClick={() => setFiltro(nome)}>
            {nome}
          </Chip>
        ))}
      </Secao>

      <Secao titulo="Modais e mensagens">
        <Button variant="strong" onClick={() => setModal(true)}>
          Abrir modal
        </Button>
        <Button variant="danger" onClick={() => setConfirmar(true)}>
          Remover funcionário
        </Button>
        <Button variant="secondary" onClick={() => toast.success('Cardápio atualizado')}>
          Toast sucesso
        </Button>
        <Button variant="secondary" onClick={() => toast.error('Não foi possível salvar', 'Confira sua conexão e tente de novo.')}>
          Toast erro
        </Button>
        <Button variant="secondary" onClick={() => toast.warning('Estoque baixo', 'Restam 3 unidades de X-Bacon.')}>
          Toast aviso
        </Button>
        <Button variant="secondary" onClick={() => toast.info('Novo pedido', 'Mesa 08 enviou um pedido.')}>
          Toast info
        </Button>
      </Secao>

      <Secao titulo="Estados">
        <div className="w-full">
          <EmptyState
            title="Nenhuma comanda aberta"
            description="Abra uma mesa para começar a registrar pedidos."
            action={<Button variant="strong">Abrir mesa</Button>}
          />
        </div>
        <Spinner label="Carregando" className="h-6 w-6 text-primary" />
      </Secao>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Novo funcionário"
        description="Preencha os dados de acesso."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModal(false);
                toast.success('Funcionário salvo');
              }}
            >
              Salvar funcionário
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nome" placeholder="Nome completo" />
          <Input label="CPF" placeholder="000.000.000-00" />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmar}
        title="Remover funcionário?"
        message="Ele perde o acesso ao sistema. O histórico de pedidos é mantido."
        confirmLabel="Remover funcionário"
        loading={removendo}
        onConfirm={remover}
        onCancel={() => setConfirmar(false)}
      />
    </div>
  );
}
