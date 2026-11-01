import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../../../context/AuthContext";
import { consultationApi, extraireErreur } from "../../../api/consultationApi";
import ModalAbandonConsultation from "./ModalAbandonConsultation";
import { formatDateHeure } from "./consultationFormat";
import styles from "./Consultations.module.css";

const CLE_POSITION = "consultationPopupPosition";
const LARGEUR = 300;
const HAUTEUR_POIGNEE = 40;

const positionParDefaut = () => ({ x: Math.max(window.innerWidth - LARGEUR - 16, 0), y: 80 });

const lirePosition = () => {
  try {
    const stockee = JSON.parse(localStorage.getItem(CLE_POSITION));
    if (Number.isFinite(stockee?.x) && Number.isFinite(stockee?.y)) return stockee;
  } catch {
    return positionParDefaut();
  }
  return positionParDefaut();
};

const ConsultationPopup = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const estMedecin = user?.role === "medecin";
  const [consultation, setConsultation] = useState(null);
  const [position, setPosition] = useState(lirePosition);
  const [abandonOuvert, setAbandonOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const glisserRef = useRef(null);

  useEffect(() => {
    if (!estMedecin) return undefined;

    let actif = true;
    consultationApi
      .enCours()
      .then((enCours) => {
        if (actif) setConsultation(enCours);
      })
      .catch(() => {
        if (actif) setConsultation(null);
      });

    return () => {
      actif = false;
    };
  }, [estMedecin, location.pathname]);

  if (!estMedecin || !consultation) return null;
  if (location.pathname === `/medecin/consultations/${consultation.id}`) return null;

  const demarrerGlisser = (event) => {
    if (event.target.closest("button")) return;
    glisserRef.current = { dx: event.clientX - position.x, dy: event.clientY - position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const glisser = (event) => {
    if (!glisserRef.current) return;
    setPosition({
      x: Math.min(Math.max(event.clientX - glisserRef.current.dx, 0), window.innerWidth - LARGEUR),
      y: Math.min(Math.max(event.clientY - glisserRef.current.dy, 0), window.innerHeight - HAUTEUR_POIGNEE),
    });
  };

  const terminerGlisser = () => {
    if (!glisserRef.current) return;
    glisserRef.current = null;
    localStorage.setItem(CLE_POSITION, JSON.stringify(position));
  };

  const abandonner = async (motif) => {
    setOccupe(true);
    try {
      await consultationApi.abandonner(consultation.id, motif);
      toast.info("Consultation abandonnée");
      setConsultation(null);
      setAbandonOuvert(false);
    } catch (error) {
      toast.error(extraireErreur(error).message);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <>
      <div
        className={styles.popup}
        style={{ left: position.x, top: position.y, width: LARGEUR }}
        role="dialog"
        aria-label="Consultation en cours"
      >
        <div
          className={styles.popupHandle}
          onPointerDown={demarrerGlisser}
          onPointerMove={glisser}
          onPointerUp={terminerGlisser}
          onPointerCancel={terminerGlisser}
        >
          Consultation en cours
        </div>
        <div className={styles.popupBody}>
          <strong>{consultation.patient.nom}</strong>
          <span className={styles.small}>Début : {formatDateHeure(consultation.heure_debut_reelle)}</span>
          <div className={styles.popupActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => navigate(`/medecin/consultations/${consultation.id}`)}
            >
              Reprendre
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={() => setAbandonOuvert(true)}
              disabled={occupe}
            >
              Abandonner
            </button>
          </div>
        </div>
      </div>

      {abandonOuvert && (
        <ModalAbandonConsultation busy={occupe} onClose={() => setAbandonOuvert(false)} onConfirm={abandonner} />
      )}
    </>
  );
};

export default ConsultationPopup;
