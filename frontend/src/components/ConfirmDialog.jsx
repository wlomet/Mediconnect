import styles from "./ConfirmDialog.module.css";

// Boîte de dialogue de confirmation réutilisable, en remplacement de window.confirm.
const ConfirmDialog = ({
  open,
  title = "Confirmation",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === "danger" ? styles.dangerButton : styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
