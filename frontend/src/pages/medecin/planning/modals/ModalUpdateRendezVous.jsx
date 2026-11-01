import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../../context/AuthContext";
import {
  X,
  Calendar,
  Clock,
  User,
  Stethoscope,
  MessageSquare,
  Trash2,
  Phone as PhoneIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../../../api/axios";
import { validatePhone } from "../../../../utils/phoneValidation";
import styles from "./ModalUpdateRendezVous.module.css";

const ModalUpdateRendezVous = ({ rendezVous, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [consultationStatut, setConsultationStatut] = useState(null);
  const [formData, setFormData] = useState({
    email: rendezVous?.email || "",
    name: rendezVous?.name || "",
    phone: rendezVous?.phone || "",
    motif: rendezVous?.motif || "",
    notes: rendezVous?.notes || "",
    statut: rendezVous?.statut || "en_attente",
  });

  // Charger les données du rendez-vous au montage du modal
  useEffect(() => {
    const fetchRendezVousDetails = async () => {
      if (!rendezVous?.id) {
        setDataLoading(false);
        return;
      }

      try {
        const response = await api.get(`/medecin/rendez-vous/${rendezVous.id}`);
        const data = response.data.rendez_vous || response.data.rendezVous;
        setConsultationStatut(data.consultation_statut ?? null);
        setFormData({
          email: data.email || "",
          name: data.name || "",
          phone: data.phone || "",
          motif: data.motif || "",
          notes: data.notes || "",
          statut: data.statut || "en_attente",
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des détails:", error);
        toast.error("Erreur lors du chargement des informations");
      } finally {
        setDataLoading(false);
      }
    };

    fetchRendezVousDetails();
  }, [rendezVous?.id]);

  const showToast = (message, type = "info") => {
    if (type === "error") {
      toast.error(message);
    } else if (type === "success") {
      toast.success(message);
    } else {
      toast.info(message);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", {
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
      showToast("Veuillez indiquer le motif", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        name: formData.name,
        phone: formData.phone || null,
        motif: formData.motif,
        notes: formData.notes || null,
        statut: formData.statut,
      };

      const response = await api.put(`/medecin/rendez-vous/${rendezVous.id}`, payload);
      const successMessage = response.data?.message || "Rendez-vous mis à jour avec succès !";
      showToast(successMessage, "success");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      let errorMessage = "Erreur lors de la mise à jour";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Êtes-vous sûr ?",
      text: "Cette action supprimera le rendez-vous de manière permanente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.delete(`/medecin/rendez-vous/${rendezVous.id}`);
      const successMessage = response.data?.message || "Rendez-vous supprimé avec succès !";
      showToast(successMessage, "success");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      let errorMessage = "Erreur lors de la suppression";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
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

  const statuts = ["en_attente", "confirmé", "annulé"];
  const motifs = ["Consultation générale", "Suivi", "Prescription", "Bilan", "Urgence", "Autre"];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <h2>Modifier le rendez-vous</h2>
            <p className={styles.modalSubtitle}>Mettez à jour les détails de la consultation</p>
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
                <p>{rendezVous?.medecin?.user?.name}</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Calendar className={styles.infoIcon} />
              <div>
                <label>Date</label>
                <p>{formatDate(rendezVous?.date_debut)}</p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Clock className={styles.infoIcon} />
              <div>
                <label>Horaire</label>
                <p>
                  {formatTime(rendezVous?.date_debut)} - {formatTime(rendezVous?.date_fin)}
                </p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <User className={styles.infoIcon} />
              <div>
                <label>Patient</label>
                <p>{rendezVous?.client_id ? rendezVous?.client?.name : rendezVous?.name}</p>
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
            <label className={styles.label}>
              <PhoneIcon className={styles.labelIcon} />
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
            <label className={styles.label}>Statut</label>
            <select
              name="statut"
              value={formData.statut}
              onChange={handleInputChange}
              className={styles.select}
              disabled={formData.statut === "terminé"}
            >
              <option value="en_attente">En attente</option>
              <option value="confirmé">Confirmé</option>
              <option value="annulé" disabled={consultationStatut === "en_cours"}>
                Annulé
              </option>
              {formData.statut === "terminé" && <option value="terminé">Terminé (fin de consultation)</option>}
            </select>
            {consultationStatut === "en_cours" && (
              <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
                Consultation en cours : annulation impossible.
              </small>
            )}
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
              placeholder="Motif de la consultation..."
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
              placeholder="Notes additionnelles..."
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={loading || consultationStatut !== null}
              title={consultationStatut ? "Consultation liée : suppression impossible" : undefined}
            >
              <Trash2 size={16} />
              Supprimer
            </button>
            <div className={styles.actionButtons}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={loading}
              >
                Annuler
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalUpdateRendezVous;
