import type { ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="confirm-copy">{description}</div>
      <div className="modal-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
          disabled={busy}
          autoFocus
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {busy ? 'Сбрасываем…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
