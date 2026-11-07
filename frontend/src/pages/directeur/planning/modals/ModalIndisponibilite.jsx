import { useState } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";
import styles from "./ModalIndisponibilite.module.css";

export default function ModalIndisponibilite({ medecinId, onClose, onUpdate }) {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [motif, setMotif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post(`/directeur/medecins/${medecinId}/indisponibilites`, {
        date_debut: dateDebut,
        date_fin: dateFin,
        motif,
      });
      toast.success("Indisponibilité ajoutée avec succès !");
      onClose();
      onUpdate();
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'indisponibilité :", error);
      const errorMessage =
        error.response?.data?.message || "Une erreur est survenue lors de la création.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fermer au clic sur l'overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculer le nombre de jours
  const calculateDays = () => {
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      const diffTime = Math.abs(fin - debut);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return null;
  };

  const days = calculateDays();

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>🚫 Ajouter une indisponibilité</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Warning Box */}
        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <span>
            Pendant cette période, vous ne pourrez pas recevoir de rendez-vous. Les patients en
            seront informés.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Date de début */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              📅 Date de début <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              className={styles.formInput}
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
            <span className={styles.helperText}>
              Date à partir de laquelle vous ne serez pas disponible
            </span>
          </div>

          {/* Date de fin */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              📅 Date de fin <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              className={styles.formInput}
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              required
              min={dateDebut || new Date().toISOString().split("T")[0]}
            />
            <span className={styles.helperText}>Date à laquelle vous redevenez disponible</span>
          </div>

          {/* Motif */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              📝 Motif <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Vacances, congé maladie, formation..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              required
              maxLength={100}
            />
            <span className={styles.helperText}>
              Raison de votre indisponibilité (visible uniquement par vous)
            </span>
          </div>

          {/* Date Range Preview */}
          {days && (
            <div className={styles.dateRangePreview}>
              📊 Durée :{" "}
              <strong>
                {days} jour{days > 1 ? "s" : ""}
              </strong>
            </div>
          )}

          {/* Buttons */}
          <div className={styles.buttonContainer}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}>⏳</span>
                  Enregistrement...
                </>
              ) : (
                <>Enregistrer l'indisponibilité</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
