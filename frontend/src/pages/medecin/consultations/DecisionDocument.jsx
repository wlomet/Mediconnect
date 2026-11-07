import { useState } from "react";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { DOCUMENT_DECISION } from "./consultationFormat";
import styles from "./Consultations.module.css";

// Choix explicite du médecin : rédiger le document ou déclarer qu'il ne sera pas établi.
const DecisionDocument = ({ type, decision, enCours, occupe, onDeclarer, onReprendre }) => {
  const [confirmOuvert, setConfirmOuvert] = useState(false);
  const libelles = DOCUMENT_DECISION[type];

  if (decision === "non_generee") {
    return (
      <>
        <div className={`${styles.banner} ${styles.bannerInfo}`}>{libelles.bandeau}</div>
        {enCours && (
          <div className={styles.actions}>
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onReprendre} disabled={occupe}>
              {libelles.reprendre}
            </button>
          </div>
        )}
      </>
    );
  }

  if (!enCours) return null;

  const declarer = () => {
    if (decision === "generee") {
      setConfirmOuvert(true);
    } else {
      onDeclarer();
    }
  };

  return (
    <>
      <div className={styles.actions}>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={declarer} disabled={occupe}>
          {libelles.declarer}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOuvert}
        title={libelles.titreConfirmation}
        message={libelles.messageConfirmation}
        confirmLabel="Supprimer et déclarer"
        cancelLabel="Annuler"
        onConfirm={() => {
          setConfirmOuvert(false);
          onDeclarer();
        }}
        onCancel={() => setConfirmOuvert(false)}
      />
    </>
  );
};

export default DecisionDocument;
