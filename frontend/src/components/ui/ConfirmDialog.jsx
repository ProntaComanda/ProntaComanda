import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Confirmação de ação (principalmente destrutiva). Nomeie a ação nos botões:
 * confirmLabel="Remover funcionário", e não só "Confirmar".
 * O foco inicial fica em "Cancelar" para um Enter sem querer não apagar nada.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      closeOnOverlay={!loading}
      title={title}
      size="sm"
      hideClose
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
    </Modal>
  );
}
