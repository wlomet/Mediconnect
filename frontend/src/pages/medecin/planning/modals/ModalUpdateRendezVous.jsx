import { useState, useEffect } from "react";
import { X, Calendar, Clock, Stethoscope, MessageSquare, Trash2, Phone, CalendarClock, Check, Ban, Mail, Lock } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../../../api/axios";
import { validatePhone } from "../../../../utils/phoneValidation";
import SelecteurCreneau from "./SelecteurCreneau";
import styles from "./ModalUpdateRendezVous.module.css";

const MOTIFS = ["Consultation générale", "Suivi", "Prescription", "Bilan", "Urgence", "Autre"];

const STATUT_LIBELLES = {
  en_attente: "En attente",
  confirmé: "Confirmé",
  annulé: "Annulé",
  terminé: "Terminé",
};

const STATUT_CLASSES = {
  en_attente: styles.statutEnAttente,
  confirmé: styles.statutConfirme,
  annulé: styles.statutAnnule,
  terminé: styles.statutTermine,
};

const ModalUpdateRendezVous = ({ rendezVous, onClose, onSuccess }) => {
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [infos, setInfos] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", motif: "", notes: "" });
  const [donneesInitiales, setDonneesInitiales] = useState(null);
  const [afficherCreneaux, setAfficherCreneaux] = useState(false);
  const [nouveauCreneau, setNouveauCreneau] = useState(null);

  // Charger les données du rendez-vous au montage
  useEffect(() => {
    const chargerRendezVous = async () => {
      try {
        const response = await api.get(`/medecin/rendez-vous/${rendezVous.id}`);
        const rdv = response.data.rendez_vous;
        const champs = {
          name: rdv.name || "",
          email: rdv.email || "",
          phone: rdv.phone || "",
          motif: rdv.motif || "",
          notes: rdv.notes || "",
        };

        setInfos({
          email: rdv.email || "",
          statut: rdv.statut,
          dateDebut: new Date(rdv.date_debut),
          dateFin: new Date(rdv.date_fin),
          medecin: rdv.medecin,
          consultationStatut: rdv.consultation_statut ?? null,
          modifiable: rdv.modifiable,
          patientVerrouille: rdv.patient_verrouille,
          peutRenvoyerEmail: rdv.peut_renvoyer_email,
        });
        setFormData(champs);
        setDonneesInitiales(champs);
      } catch (error) {
        console.error("Erreur lors de la récupération des détails:", error);
        toast.error("Erreur lors du chargement des informations");
      } finally {
        setChargement(false);
      }
    };

    chargerRendezVous();
  }, [rendezVous.id]);

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

  const extraireMessage = (error, messageParDefaut) => error.response?.data?.message || messageParDefaut;

  const modifie =
    donneesInitiales !== null &&
    (nouveauCreneau !== null || Object.keys(formData).some((cle) => formData[cle] !== donneesInitiales[cle]));
  const verrouille = infos !== null && !infos.modifiable;
  const patientBloque = verrouille || Boolean(infos?.patientVerrouille);
  const creneauActuel = infos ? { start: infos.dateDebut, end: infos.dateFin } : null;
  const creneauAffiche = nouveauCreneau ?? creneauActuel;
  const actionsBloquees = modifie || actionEnCours || enregistrement;
  const annulationPossible =
    infos !== null &&
    (infos.statut === "en_attente" || infos.statut === "confirmé") &&
    infos.consultationStatut !== "en_cours";

  const choisirCreneau = (creneau) => {
    const memeQueActuel = creneauActuel && creneau.start.getTime() === creneauActuel.start.getTime();
    setNouveauCreneau(memeQueActuel ? null : creneau);
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

    let chevauchementAutorise = false;
    if (nouveauCreneau?.occupe) {
      const confirmation = await Swal.fire({
        title: "Créneau déjà occupé",
        text: "Un autre rendez-vous occupe déjà ce créneau. Voulez-vous quand même l'attribuer à ce patient ?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Oui, attribuer quand même",
        cancelButtonText: "Choisir un autre créneau",
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
      });

      if (!confirmation.isConfirmed) {
        return;
      }

      chevauchementAutorise = true;
    }

    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      motif: formData.motif,
      notes: formData.notes || null,
      chevauchement_autorise: chevauchementAutorise,
    };

    if (nouveauCreneau) {
      payload.date_debut = nouveauCreneau.start.toISOString();
      payload.date_fin = nouveauCreneau.end.toISOString();
    }

    setEnregistrement(true);
    try {
      const response = await api.put(`/medecin/rendez-vous/${rendezVous.id}`, payload);
      const successMessage = response.data?.message || "Rendez-vous mis à jour avec succès !";
      showToast(successMessage, "success");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      showToast(extraireMessage(error, "Erreur lors de la mise à jour"), "error");
    } finally {
      setEnregistrement(false);
    }
  };

  const executerStatut = async (action, messageSucces) => {
    setActionEnCours(true);
    try {
      const response = await action();
      showToast(response.data?.message || messageSucces, "success");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      showToast(extraireMessage(error, "Action impossible"), "error");
      setActionEnCours(false);
    }
  };

  const confirmerRendezVous = async () => {
    const resultat = await Swal.fire({
      title: "Confirmer le rendez-vous ?",
      text: "Le patient recevra un email de confirmation si son adresse appartient à un compte vérifié.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, confirmer",
      cancelButtonText: "Retour",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
    });

    if (!resultat.isConfirmed) {
      return;
    }

    await executerStatut(
      () => api.put(`/medecin/rendez-vous/${rendezVous.id}`, { statut: "confirmé" }),
      "Rendez-vous confirmé"
    );
  };

  const annulerRendezVous = async () => {
    const resultat = await Swal.fire({
      title: "Annuler le rendez-vous ?",
      text: "Le rendez-vous passera au statut annulé.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, annuler le rendez-vous",
      cancelButtonText: "Retour",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    });

    if (!resultat.isConfirmed) {
      return;
    }

    await executerStatut(
      () => api.put(`/medecin/rendez-vous/${rendezVous.id}`, { statut: "annulé" }),
      "Rendez-vous annulé"
    );
  };

  const renvoyerEmail = async () => {
    const resultat = await Swal.fire({
      title: "Renvoyer l'email de confirmation ?",
      text: `Un email sera envoyé à ${infos.email}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Oui, renvoyer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#0596de",
      cancelButtonColor: "#6b7280",
    });

    if (!resultat.isConfirmed) {
      return;
    }

    setActionEnCours(true);
    try {
      const response = await api.post(`/medecin/rendez-vous/${rendezVous.id}/renvoyer-email`);
      showToast(response.data?.message || "Email de confirmation renvoyé", "success");
    } catch (error) {
      showToast(extraireMessage(error, "Envoi de l'email impossible"), "error");
    } finally {
      setActionEnCours(false);
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

    setActionEnCours(true);
    try {
      const response = await api.delete(`/medecin/rendez-vous/${rendezVous.id}`);
      const successMessage = response.data?.message || "Rendez-vous supprimé avec succès !";
      showToast(successMessage, "success");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      showToast(extraireMessage(error, "Erreur lors de la suppression"), "error");
      setActionEnCours(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
        {chargement || !infos ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>{chargement ? "Chargement des données..." : "Impossible de charger le rendez-vous."}</p>
          </div>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <h2>Modifier le rendez-vous</h2>
                <p className={styles.modalSubtitle}>Mettez à jour les détails de la consultation</p>
              </div>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={24} />
              </button>
            </div>

            {verrouille && (
              <div className={styles.bannerLock}>
                <Lock size={16} />
                <span>Consultation liée à ce rendez-vous : informations et créneau non modifiables.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.infoSection}>
                <h3 className={styles.sectionTitle}>Informations générales</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <Stethoscope className={styles.infoIcon} />
                    <div>
                      <label>Médecin</label>
                      <p>{infos.medecin?.name ? `Dr. ${infos.medecin.name}` : "Non renseigné"}</p>
                    </div>
                  </div>

                  <div className={styles.infoItem}>
                    <Calendar className={styles.infoIcon} />
                    <div>
                      <label>Date</label>
                      <p>{formatDate(creneauAffiche.start)}</p>
                    </div>
                  </div>

                  <div className={styles.infoItem}>
                    <Clock className={styles.infoIcon} />
                    <div>
                      <label>Horaire</label>
                      <p>
                        {formatTime(creneauAffiche.start)} - {formatTime(creneauAffiche.end)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.creneauLigne}>
                  <button
                    type="button"
                    className={styles.boutonCreneau}
                    onClick={() => setAfficherCreneaux((ouvert) => !ouvert)}
                    disabled={verrouille || actionEnCours || enregistrement}
                  >
                    <CalendarClock size={16} />
                    {afficherCreneaux ? "Masquer les créneaux" : "Changer de créneau"}
                  </button>
                  {nouveauCreneau && (
                    <button type="button" className={styles.lienAnnuler} onClick={() => setNouveauCreneau(null)}>
                      Annuler le changement
                    </button>
                  )}
                </div>

                {nouveauCreneau && (
                  <p className={`${styles.noteCreneau} ${nouveauCreneau.occupe ? styles.noteCreneauOccupe : ""}`}>
                    Nouveau créneau : {formatDate(nouveauCreneau.start)}, de {formatTime(nouveauCreneau.start)} à{" "}
                    {formatTime(nouveauCreneau.end)}. {nouveauCreneau.occupe ? "Ce créneau est déjà occupé. " : ""}
                    Enregistrez pour appliquer le changement.
                  </p>
                )}

                {afficherCreneaux && (
                  <SelecteurCreneau
                    rendezVousId={rendezVous.id}
                    creneauActuel={creneauActuel}
                    creneauChoisi={nouveauCreneau}
                    onChoisir={choisirCreneau}
                    onFermer={() => setAfficherCreneaux(false)}
                  />
                )}

                <h4 className={styles.sousTitre}>Patient</h4>
                {infos.patientVerrouille && (
                  <p className={styles.noteVerrou}>
                    <Lock size={14} />
                    Rendez-vous pris par le patient depuis son compte : ses informations ne sont pas modifiables.
                  </p>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    disabled={patientBloque}
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
                    disabled={patientBloque}
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
                    disabled={patientBloque}
                    className={styles.input}
                  />
                  <small style={{ color: "#666", marginTop: "4px", display: "block" }}>
                    ou email ci-dessus
                  </small>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Informations du rendez-vous</h3>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <MessageSquare className={styles.labelIcon} />
                    Motif du rendez-vous *
                  </label>

                  <div className={styles.motifSuggestions}>
                    {MOTIFS.map((motif) => (
                      <button
                        key={motif}
                        type="button"
                        disabled={verrouille}
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
                    disabled={verrouille}
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
                    disabled={verrouille}
                    className={styles.textarea}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Actions</h3>
                <div className={styles.cards}>
                  <div className={styles.card}>
                    <p className={styles.cardTitle}>
                      <CalendarClock size={16} />
                      Statut du rendez-vous
                    </p>
                    <span className={`${styles.badgeStatut} ${STATUT_CLASSES[infos.statut] || ""}`}>
                      {STATUT_LIBELLES[infos.statut] || infos.statut}
                    </span>

                    {infos.statut === "en_attente" && (
                      <button
                        type="button"
                        className={`${styles.boutonAction} ${styles.boutonConfirmer}`}
                        onClick={confirmerRendezVous}
                        disabled={actionsBloquees}
                      >
                        <Check size={16} />
                        Confirmer le rendez-vous
                      </button>
                    )}

                    {(infos.statut === "en_attente" || infos.statut === "confirmé") && (
                      <button
                        type="button"
                        className={`${styles.boutonAction} ${styles.boutonAnnulerRdv}`}
                        onClick={annulerRendezVous}
                        disabled={actionsBloquees || !annulationPossible}
                      >
                        <Ban size={16} />
                        Annuler le rendez-vous
                      </button>
                    )}

                    {infos.consultationStatut === "en_cours" && (
                      <p className={styles.cardHint}>Consultation en cours : annulation impossible.</p>
                    )}
                    {modifie && (
                      <p className={styles.cardHint}>Enregistrez vos modifications avant de changer le statut.</p>
                    )}
                  </div>

                  {infos.statut === "confirmé" && (
                    <div className={styles.card}>
                      <p className={styles.cardTitle}>
                        <Mail size={16} />
                        Email de confirmation
                      </p>
                      <p className={styles.cardText}>
                        Renvoie la confirmation à {infos.email || "l'adresse du patient"}.
                      </p>
                      <button
                        type="button"
                        className={`${styles.boutonAction} ${styles.boutonEmail}`}
                        onClick={renvoyerEmail}
                        disabled={!infos.peutRenvoyerEmail || modifie || actionEnCours || enregistrement}
                      >
                        <Mail size={16} />
                        Renvoyer l'email
                      </button>
                      {!infos.peutRenvoyerEmail && (
                        <p className={styles.cardHint}>Aucun compte vérifié n'est associé à cette adresse.</p>
                      )}
                      {modifie && (
                        <p className={styles.cardHint}>Enregistrez vos modifications avant de renvoyer l'email.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={styles.deleteButton}
                  disabled={verrouille || actionEnCours || enregistrement}
                  title={verrouille ? "Consultation liée : suppression impossible" : undefined}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    onClick={onClose}
                    className={styles.cancelButton}
                    disabled={actionEnCours || enregistrement}
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!modifie || verrouille || actionEnCours || enregistrement}
                  >
                    {enregistrement ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalUpdateRendezVous;
