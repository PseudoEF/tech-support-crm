import { useCallback, useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflowRef = useRef('');
  const reducedMotion = useReducedMotion();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }, [open]);

  const finishClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    document.body.style.overflow = previousOverflowRef.current;
  }, []);

  useEffect(() => finishClose, [finishClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence onExitComplete={finishClose}>
      {open ? (
        <motion.dialog
          ref={dialogRef}
          className={`modal ${className}`.trim()}
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.16 }}
          onCancel={(event) => {
            event.preventDefault();
            onClose();
          }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="modal-panel"
            initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <header className="modal-header">
              <h2 id={titleId}>{title}</h2>
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Закрыть окно"
              >
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="modal-body">{children}</div>
          </motion.div>
        </motion.dialog>
      ) : null}
    </AnimatePresence>
  );
}
