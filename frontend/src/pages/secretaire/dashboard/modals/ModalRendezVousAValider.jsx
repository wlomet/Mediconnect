import { useState, useEffect } from "react";
import { X, Pencil } from "lucide-react";
import api from "../../../../api/axios";
import ModalUpdateRendezVous from "../../planning/modals/ModalUpdateRendezVous";
import styles from "./ModalRendezVousAValider.module.css";

const ModalRendezVousAValider = ({ onClose, onUpdate }) => {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [rendezVous, setRendezVous] = useState([]);
  const [rdvAModifier, setRdvAModifier] = useState(null);

  const chargerListe = async () => {
    try {
      setErreur(null);
      const response = await api.get("/secretaire/rendez-vous/a-valider");
      setRendezVous(response.data.rendez_vous || []);
    } catch (err) {
      console.error("Erreur lors du chargement des rendez-vous à valider:", err);
      setErreur("Impossible de charger la liste");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerListe();
  }, []);

  const formatDate = (value) =>
    new Date(value).toLocaleString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const apresModification = () => {
    chargerListe();
    onUpdate();
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Rendez-vous à valider</h2>
              {!chargement && !erreur && (
                <p className={styles.modalSubtitle}>{rendezVous.length} en attente de validation</p>
              )}
            </div>
            <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Fermer">
              <X size={24} />
            </button>
          </div>

          <div className={styles.modalBody}>
            {chargement ? (
              <p className={styles.message}>Chargement des rendez-vous...</p>
            ) : erreur ? (
              <p className={styles.messageErreur}>{erreur}</p>
            ) : rendezVous.length === 0 ? (
              <p className={styles.message}>Aucun rendez-vous à valider.</p>
            ) : (
              <ul className={styles.liste}>
                {rendezVous.map((rdv) => (
                  <li key={rdv.id} className={styles.ligne}>
                    <div className={styles.infos}>
                      <span className={styles.nom}>{rdv.name}</span>
                      <span className={styles.detail}>Dr. {rdv.medecin?.name}</span>
                      <span className={styles.detail}>
                        {formatDate(rdv.date_debut)}
                        {rdv.motif ? ` · ${rdv.motif}` : ""}
                      </span>
                      {(rdv.email || rdv.phone) && (
                        <span className={styles.contact}>{rdv.email || rdv.phone}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.boutonModifier}
                      onClick={() => setRdvAModifier(rdv)}
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {rdvAModifier && (
        <ModalUpdateRendezVous
          rendezVous={rdvAModifier}
          onClose={() => setRdvAModifier(null)}
          onSuccess={apresModification}
        />
      )}
    </>
  );
};

export default ModalRendezVousAValider;
