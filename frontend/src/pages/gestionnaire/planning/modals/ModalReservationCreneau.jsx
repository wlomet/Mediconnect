import { useState } from "react";
import { X, Calendar, Clock, User, Stethoscope, MessageSquare, Phone } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../../../../api/axios";
import { validatePhone } from "../../../../utils/phoneValidation";
import styles from "./ModalReservationCreneau.module.css";

const ModalReservationCreneau = ({ medecin, creneau, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    motif: "",
    notes: "",
    statut: "en_attente",
  });

  const showToast = (message, type = "info") => {
    if (type === "error") {
      toast.error(message);
    } else if (type === "success") {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.email.trim() && !formData.phone.trim()) {
      showToast("Veuillez indiquer au moins un email ou un téléphone", "error");
      return;
    }

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      showToast(phoneError, "error");
      return;
    }

    if (!formData.name.trim()) {
      showToast("Veuillez indiquer le nom", "error");
      return;
    }

    if (!formData.motif.trim()) {
      showToast("Veuillez indiquer le motif du rendez-vous", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        name: formData.name,
        phone: formData.phone || null,
        medecin_id: medecin.medecin_id,
        date_debut: creneau.start.toISOString(),
        date_fin: creneau.end.toISOString(),
        motif: formData.motif,
        notes: formData.notes || null,
        statut: formData.statut,
      };

      const response = await axiosInstance.post("/gestionnaire/rendez-vous", payload);
      const successMessage = response.data?.message || "Réservation effectuée avec succès !";
      showToast(successMessage, "success");
      onSuccess(response.data?.rendezVous);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      let errorMessage = "Erreur lors de la réservation";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage = "Ce créneau n'est plus disponible.";
      } else if (error.response?.status === 422) {
        errorMessage = "Données invalides. Vérifiez le formulaire.";
      }
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const motifs = ["Consultation générale", "Suivi", "Prescription", "Bilan", "Urgence", "Autre"];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <h2>Réserver ce créneau</h2>
            <p className={styles.modalSubtitle}>Confirmez les informations du rendez-vous</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Stethoscope className={styles.infoIcon} />
              <div>
                <label>Médecin</label>
                <p>Dr. {medecin?.name}</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Calendar className={styles.infoIcon} />
              <div>
                <label>Date</label>
                <p>{formatDate(creneau.start)}</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Clock className={styles.infoIcon} />
              <div>
                <label>Horaire</label>
                <p>
                  {formatTime(creneau.start)} - {formatTime(creneau.end)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="email@example.com"
              className={styles.input}
            />
            <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
              ou téléphone ci-dessous
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Nom *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Nom de la personne"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <Phone className={styles.labelIcon} />
              Téléphone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+33 6 12 34 56 78"
              className={styles.input}
            />
            <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
              ou email ci-dessus
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="en_attente">En attente</option>
              <option value="confirmé">Confirmé</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <MessageSquare className={styles.labelIcon} />
              Motif du rendez-vous *
            </label>

            <div className={styles.motifSuggestions}>
              {motifs.map((motif) => (
                <button
                  key={motif}
                  type="button"
                  className={`${styles.motifChip} ${formData.motif === motif ? styles.motifChipActive : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, motif }))}
                >
                  {motif}
                </button>
              ))}
            </div>

            <textarea
              name="motif"
              value={formData.motif}
              onChange={handleInputChange}
              placeholder="Précisez la raison de la consultation..."
              rows={3}
              required
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Notes (optionnel)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Informations complémentaires..."
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Annuler
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Réservation..." : "Confirmer la réservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalReservationCreneau;
