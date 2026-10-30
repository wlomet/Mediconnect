import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { X, Calendar, Clock, User, Stethoscope, MessageSquare, Phone, Mail } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import styles from "./ModalRendezVous.module.css";
import { validatePhone } from "../../../utils/phoneValidation";

const ModalRendezVous = ({ medecin, creneau, onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(null);
  const [formData, setFormData] = useState({
    motif: "",
    notes: "",
    email: "",
    phone: "",
    name: "",
  });

  // Vérifier au montage si l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [user]);

  // Formater la date pour l'affichage
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.motif.trim()) {
      toast.error("Veuillez indiquer le motif de la consultation");
      return;
    }

    // Pour les utilisateurs non connectés, vérifier qu'au moins email ou phone est fourni
    if (!isConnected && !formData.email.trim() && !formData.phone.trim()) {
      toast.error("Veuillez fournir soit un email, soit un numéro de téléphone");
      return;
    }

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    // Pour les utilisateurs non connectés, le name est obligatoire
    if (!isConnected && !formData.name.trim()) {
      toast.error("Veuillez indiquer votre nom");
      return;
    }

    setLoading(true);
    try {
      const rendezVousData = {
        medecin_id: medecin.medecin_id,
        date_debut: creneau.start.toISOString(),
        date_fin: creneau.end.toISOString(),
        motif: formData.motif,
        notes: formData.notes || null,
        statut: "en_attente",
      };

      // Si connecté, ajouter client_id et utiliser les infos du user
      if (isConnected) {
        rendezVousData.client_id = user.id;
        rendezVousData.email = user.email;
        rendezVousData.name = user.name;
      } else {
        // Si non connecté, ajouter email, phone et name fournis
        rendezVousData.client_id = null;
        rendezVousData.email = formData.email || null;
        rendezVousData.phone = formData.phone || null;
        rendezVousData.name = formData.name || null;
      }

      console.log("Envoi des données:", rendezVousData);

      const response = await api.post("/rendezvous", rendezVousData);

      console.log("Rendez-vous créé:", response.data);

      toast.success("Rendez-vous pris avec succès !");
      onSuccess(response.data.rendezVous);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la prise de rendez-vous:", error);

      let errorMessage = "Erreur lors de la prise de rendez-vous";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 422) {
        errorMessage = "Données invalides. Veuillez vérifier les informations.";
      } else if (error.response?.status === 409) {
        errorMessage = "Ce créneau n'est plus disponible. Veuillez en choisir un autre.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const motifsPredefinis = [
    "Consultation générale",
    "Suivi médical",
    "Prescription",
    "Bilan de santé",
    "Urgence",
    "Vaccination",
    "Autre",
  ];

  if (isConnected === null) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className={styles.spinner}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <h2>Prendre un rendez-vous</h2>
            <p className={styles.modalSubtitle}>Confirmez les détails de votre consultation</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Informations du rendez-vous */}
        <div className={styles.infoSection}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Stethoscope className={styles.infoIcon} />
              <div>
                <label>Médecin</label>
                <p>Dr. {medecin.name}</p>
                {medecin.specialite && (
                  <span className={styles.specialite}>{medecin.specialite}</span>
                )}
                {medecin.telephone && (
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    <Phone size={14} style={{ display: "inline", marginRight: "0.25rem" }} />
                    {medecin.telephone}
                  </p>
                )}
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

            <div className={styles.infoItem}>
              <User className={styles.infoIcon} />
              <div>
                <label>Patient</label>
                <p>{isConnected ? user?.name : "Non connecté"}</p>
                <span className={styles.email}>
                  {isConnected ? user?.email : "Veuillez fournir vos coordonnées"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Champs pour utilisateurs non connectés */}
          {!isConnected && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <User className={styles.labelIcon} />
                  Nom complet *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Mail className={styles.labelIcon} />
                  Email (optionnel si téléphone fourni)
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="votre.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <Phone className={styles.labelIcon} />
                  Numéro de téléphone (optionnel si email fourni)
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+33 6 12 34 56 78"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
            </>
          )}

          {/* Motif de consultation */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <MessageSquare className={styles.labelIcon} />
              Motif de la consultation *
            </label>

            {/* Suggestions de motifs */}
            <div className={styles.motifSuggestions}>
              {motifsPredefinis.map((motif, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.motifChip} ${
                    formData.motif === motif ? styles.motifChipActive : ""
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, motif }))}
                >
                  {motif}
                </button>
              ))}
            </div>

            <textarea
              name="motif"
              placeholder="Décrivez brièvement la raison de votre consultation..."
              value={formData.motif}
              onChange={handleInputChange}
              required
              rows={3}
              className={styles.textarea}
            />
          </div>

          {/* Notes supplémentaires */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Notes supplémentaires (optionnel)</label>
            <textarea
              name="notes"
              placeholder="Informations complémentaires, symptômes particuliers, antécédents..."
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className={styles.textarea}
            />
          </div>

          {/* Actions */}
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Annuler
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Prise de rendez-vous...
                </>
              ) : (
                "Confirmer le rendez-vous"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalRendezVous;
