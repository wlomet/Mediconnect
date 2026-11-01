import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { consultationApi, extraireErreur } from "../../../api/consultationApi";
import { validatePhone } from "../../../utils/phoneValidation";
import { formatDateHeure } from "./consultationFormat";
import styles from "./Consultations.module.css";

const CHAMPS_VIDES = { name: "", email: "", phone: "", motif: "" };

const ModalDemarrerConsultation = ({ onClose }) => {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState("rendez-vous");
  const [recherche, setRecherche] = useState("");
  const [rendezVous, setRendezVous] = useState([]);
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [consultationExistanteId, setConsultationExistanteId] = useState(null);

  useEffect(() => {
    if (onglet !== "rendez-vous") return undefined;

    const minuteur = setTimeout(() => {
      consultationApi
        .rendezVousDisponibles(recherche)
        .then(setRendezVous)
        .catch(() => toast.error("Impossible de charger les rendez-vous"));
    }, 300);

    return () => clearTimeout(minuteur);
  }, [onglet, recherche]);

  const demarrer = async (payload) => {
    setOccupe(true);
    setErreur("");
    setConsultationExistanteId(null);

    try {
      const consultation = await consultationApi.demarrer(payload);
      toast.success("Consultation démarrée");
      navigate(`/medecin/consultations/${consultation.id}`);
    } catch (error) {
      const { message, consultationId } = extraireErreur(error, "Impossible de démarrer la consultation");
      setErreur(message);
      setConsultationExistanteId(consultationId);
    } finally {
      setOccupe(false);
    }
  };

  const soumettreRapide = (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.motif.trim()) {
      setErreur("Le nom et le motif sont obligatoires");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      setErreur("Indiquez un email ou un téléphone");
      return;
    }
    const erreurTelephone = form.phone.trim() ? validatePhone(form.phone) : null;
    if (erreurTelephone) {
      setErreur(erreurTelephone);
      return;
    }

    demarrer({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      motif: form.motif.trim(),
    });
  };

  const onChangeChamp = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const messageErreur = erreur && (
    <p className={styles.error}>
      {erreur}
      {consultationExistanteId && (
        <>
          {" "}
          <button
            type="button"
            className={styles.link}
            onClick={() => navigate(`/medecin/consultations/${consultationExistanteId}`)}
          >
            Ouvrir la consultation
          </button>
        </>
      )}
    </p>
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <h2 className={styles.modalTitle}>Démarrer une consultation</h2>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${onglet === "rendez-vous" ? styles.tabActive : ""}`}
            onClick={() => setOnglet("rendez-vous")}
          >
            Rendez-vous existant
          </button>
          <button
            type="button"
            className={`${styles.tab} ${onglet === "rapide" ? styles.tabActive : ""}`}
            onClick={() => setOnglet("rapide")}
          >
            Création rapide
          </button>
        </div>

        {onglet === "rendez-vous" && (
          <>
            <div className={styles.field}>
              <input
                type="search"
                className={styles.input}
                placeholder="Rechercher par nom, email ou téléphone"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
              />
            </div>
            <div className={styles.list}>
              {rendezVous.length === 0 && (
                <p className={styles.empty}>Aucun rendez-vous à démarrer aujourd'hui.</p>
              )}
              {rendezVous.map((rdv) => (
                <button
                  key={rdv.id}
                  type="button"
                  className={styles.rdvItem}
                  disabled={occupe}
                  onClick={() => demarrer({ rendez_vous_id: rdv.id })}
                >
                  <strong>{rdv.name}</strong>
                  <span className={styles.small}>
                    {formatDateHeure(rdv.date_debut)} · {rdv.motif}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {onglet === "rapide" && (
          <form onSubmit={soumettreRapide}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rapide-name">Nom du patient *</label>
              <input id="rapide-name" name="name" className={styles.input} value={form.name} onChange={onChangeChamp} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rapide-email">Email</label>
              <input id="rapide-email" name="email" type="email" className={styles.input} value={form.email} onChange={onChangeChamp} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rapide-phone">Téléphone</label>
              <input id="rapide-phone" name="phone" type="tel" className={styles.input} value={form.phone} onChange={onChangeChamp} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rapide-motif">Motif *</label>
              <textarea id="rapide-motif" name="motif" className={styles.textarea} value={form.motif} onChange={onChangeChamp} />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onClose} disabled={occupe}>
                Annuler
              </button>
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={occupe}>
                {occupe ? "Démarrage..." : "Démarrer"}
              </button>
            </div>
          </form>
        )}

        {messageErreur}
      </div>
    </div>
  );
};

export default ModalDemarrerConsultation;
