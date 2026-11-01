import { useState } from "react";
import styles from "./Consultations.module.css";

const MOTIF_MIN = 3;

const ModalAbandonConsultation = ({ onClose, onConfirm, busy = false }) => {
  const [motif, setMotif] = useState("");
  const valide = motif.trim().length >= MOTIF_MIN;

  const soumettre = (event) => {
    event.preventDefault();
    if (valide) onConfirm(motif.trim());
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(event) => event.stopPropagation()} onSubmit={soumettre}>
        <h2 className={styles.modalTitle}>Abandonner la consultation</h2>
        <p className={styles.muted}>
          La consultation est conservée et pourra être reprise. Indiquez la justification.
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="motif-abandon">Justification *</label>
          <textarea
            id="motif-abandon"
            className={styles.textarea}
            value={motif}
            onChange={(event) => setMotif(event.target.value)}
            placeholder="Ex. : patient parti avant la fin de la consultation"
          />
        </div>
        <div className={styles.modalActions}>
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className={`${styles.button} ${styles.danger}`} disabled={!valide || busy}>
            {busy ? "Abandon..." : "Abandonner"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ModalAbandonConsultation;
