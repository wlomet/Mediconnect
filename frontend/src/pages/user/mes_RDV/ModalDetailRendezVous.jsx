import { X, Calendar, Clock, User, Stethoscope, MessageSquare, ClipboardList, Download } from "lucide-react";
import styles from "./ModalDetailRendezVous.module.css";
import {
  STATUT_CONSULTATION_LABELS,
  STATUT_RENDEZ_VOUS_LABELS,
  TYPE_DOCUMENT_LABELS,
  formatDateHeure,
  formatMontant,
  telechargerDocument,
} from "../utils/clientDossier";

const CLASSES_STATUT_RDV = {
  en_attente: styles.statusPending,
  confirmé: styles.statusConfirmed,
  annulé: styles.statusCancelled,
  terminé: styles.statusCompleted,
};

const CLASSES_STATUT_CONSULTATION = {
  en_cours: styles.statusPending,
  terminee: styles.statusConfirmed,
  abandonnee: styles.statusCancelled,
};

const SectionConsultation = ({ consultation }) => (
  <div className={styles.consultationSection}>
    <div className={styles.consultationHeader}>
      <h3 className={styles.consultationTitle}>
        <ClipboardList className={styles.labelIcon} />
        Consultation
      </h3>
      <span
        className={`${styles.badge} ${CLASSES_STATUT_CONSULTATION[consultation.statut] ?? styles.statusDefault}`}
      >
        {STATUT_CONSULTATION_LABELS[consultation.statut] ?? consultation.statut}
      </span>
    </div>

    <dl className={styles.consultationInfos}>
      <dt>Début</dt>
      <dd>{formatDateHeure(consultation.heure_debut_reelle)}</dd>
      <dt>Fin</dt>
      <dd>{formatDateHeure(consultation.ended_at)}</dd>
      {consultation.medecin?.hopital && (
        <>
          <dt>Établissement</dt>
          <dd>
            {consultation.medecin.hopital.name}
            {consultation.medecin.hopital.adresse && `, ${consultation.medecin.hopital.adresse}`}
          </dd>
        </>
      )}
    </dl>

    <div className={styles.consultationBlock}>
      <h4 className={styles.blockTitle}>Ordonnance</h4>
      {consultation.ordonnance_texte ? (
        <p className={styles.texte}>{consultation.ordonnance_texte}</p>
      ) : (
        <p className={styles.muted}>Aucune ordonnance rédigée.</p>
      )}
    </div>

    <div className={styles.consultationBlock}>
      <h4 className={styles.blockTitle}>Facture</h4>
      {consultation.facture ? (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Libellé</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {consultation.facture.lignes.map((ligne, index) => (
                <tr key={`${ligne.libelle}-${index}`}>
                  <td>{ligne.libelle}</td>
                  <td>{Number(ligne.quantite)}</td>
                  <td>{formatMontant(ligne.prix_unitaire)}</td>
                  <td>{formatMontant(ligne.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.total}>Total : {formatMontant(consultation.facture.total)}</p>
        </>
      ) : (
        <p className={styles.muted}>Aucune facture.</p>
      )}
    </div>

    <div className={styles.consultationBlock}>
      <h4 className={styles.blockTitle}>Documents</h4>
      {consultation.documents.length === 0 ? (
        <p className={styles.muted}>Aucun document archivé.</p>
      ) : (
        <ul className={styles.documentList}>
          {consultation.documents.map((doc) => (
            <li key={doc.id} className={styles.documentItem}>
              <span>
                {TYPE_DOCUMENT_LABELS[doc.type] ?? doc.type} - {doc.titre}
              </span>
              <button
                type="button"
                className={styles.downloadButton}
                onClick={() => telechargerDocument(doc)}
              >
                <Download size={14} />
                Télécharger
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

const ModalDetailRendezVous = ({ appointment, onClose, loading }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (statut) => (
    <span className={`${styles.badge} ${CLASSES_STATUT_RDV[statut] ?? styles.statusDefault}`}>
      {STATUT_RENDEZ_VOUS_LABELS[statut] ?? statut}
    </span>
  );

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <h2>Détails du rendez-vous</h2>
            <p className={styles.modalSubtitle}>Informations de votre consultation</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Chargement des détails...</p>
          </div>
        ) : (
          <>
            {/* Informations du rendez-vous */}
            <div className={styles.infoSection}>
              <div className={styles.statusContainer}>{getStatusBadge(appointment.statut)}</div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <Stethoscope className={styles.infoIcon} />
                  <div>
                    <label>Médecin</label>
                    <p>Dr. {appointment.medecin?.name || "Non assigné"}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <Calendar className={styles.infoIcon} />
                  <div>
                    <label>Date</label>
                    <p>{formatDate(appointment.date_debut)}</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <Clock className={styles.infoIcon} />
                  <div>
                    <label>Horaire</label>
                    <p>
                      {formatTime(appointment.date_debut)} - {formatTime(appointment.date_fin)}
                    </p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <User className={styles.infoIcon} />
                  <div>
                    <label>Patient</label>
                    <p>{appointment.name}</p>
                    <span className={styles.email}>{appointment.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Détails supplémentaires */}
            <div className={styles.detailsSection}>
              {appointment.motif && (
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>
                    <MessageSquare className={styles.labelIcon} />
                    Motif de la consultation
                  </label>
                  <p className={styles.detailText}>{appointment.motif}</p>
                </div>
              )}

              {appointment.notes && (
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>
                    <MessageSquare className={styles.labelIcon} />
                    Notes supplémentaires
                  </label>
                  <p className={styles.detailText}>{appointment.notes}</p>
                </div>
              )}
            </div>

            {appointment.consultation && <SectionConsultation consultation={appointment.consultation} />}

            {/* Actions */}
            <div className={styles.modalActions}>
              <button onClick={onClose} className={styles.closeModalButton}>
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalDetailRendezVous;
