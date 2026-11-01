import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchImagesForLayout, pdfApi } from "../../../api/pdfApi";
import { generatePdf } from "../../../utils/pdf/generatePdf";
import { normalizeLayout } from "../../../utils/pdf/layout";
import { valeursConsultation } from "./consultationPdf";
import styles from "./Consultations.module.css";

const TITRES = {
  ordonnance: "Aperçu de l'ordonnance",
  facture: "Aperçu de la facture",
};

const ModalApercu = ({ type, rendezVousId, texte, lignes, onClose }) => {
  const [modeles, setModeles] = useState(null);
  const [modeleId, setModeleId] = useState("");
  const [url, setUrl] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;

    pdfApi
      .listTemplates(type)
      .then((liste) => {
        if (!actif) return;
        const duType = liste.filter((modele) => modele.type === type);
        setModeles(duType);
        setModeleId(duType[0] ? String(duType[0].id) : "");
      })
      .catch(() => {
        if (actif) setErreur("Impossible de charger les modèles");
      });

    return () => {
      actif = false;
    };
  }, [type]);

  useEffect(() => {
    if (!modeleId) return undefined;

    let actif = true;
    let objectUrl = null;

    Promise.all([pdfApi.getTemplate(modeleId), pdfApi.getPdfData(rendezVousId)])
      .then(async ([modele, donnees]) => {
        const layout = normalizeLayout(modele.layout);
        const bytes = await generatePdf({
          layout,
          data: donnees,
          values: valeursConsultation(layout, { texte, lignes }),
          images: await fetchImagesForLayout(layout.elements ?? [], pdfApi),
        });
        if (!actif) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        setErreur("");
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (actif) setErreur(error.message || "Génération du PDF impossible");
      });

    return () => {
      actif = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [modeleId, rendezVousId, texte, lignes]);

  const sansModele = modeles !== null && modeles.length === 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.previewModal}`} onClick={(event) => event.stopPropagation()}>
        <div className={styles.previewHeader}>
          <h2 className={styles.modalTitle}>{TITRES[type]}</h2>
          {modeles?.length > 0 && (
            <select className={`${styles.select} ${styles.previewSelect}`} value={modeleId} onChange={(event) => setModeleId(event.target.value)}>
              {modeles.map((modele) => (
                <option key={modele.id} value={modele.id}>
                  {modele.nom}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.previewBody}>
          {sansModele && (
            <p className={styles.empty}>
              Aucun modèle de {type}. Créez-en un depuis <Link to="/medecin/pdf-templates" className={styles.link}>Modèles de documents</Link>.
            </p>
          )}
          {erreur && <p className={styles.error}>{erreur}</p>}
          {!sansModele && !erreur && !url && <p className={styles.empty}>Génération de l'aperçu...</p>}
          {url && <iframe className={styles.previewFrame} src={url} title="Aperçu du PDF" />}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalApercu;
