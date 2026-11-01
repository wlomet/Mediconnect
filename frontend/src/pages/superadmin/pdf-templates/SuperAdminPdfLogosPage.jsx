import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OwnerSelect from "./OwnerSelect";
import PdfImageLibrary from "../../medecin/pdf-templates/PdfImageLibrary";
import { superAdminPdfApi } from "../../../api/superAdminApi";
import styles from "../../medecin/pdf-templates/PdfLogosPage.module.css";

export default function SuperAdminPdfLogosPage() {
  const navigate = useNavigate();
  const [proprietaire, setProprietaire] = useState({ type: "hopital", id: "" });

  const cible = proprietaire.id ? { owner_type: proprietaire.type, owner_id: proprietaire.id } : null;

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => navigate("/super-admin/pdf-templates")}>
            Retour aux modèles
          </button>
          <h1 className={styles.title}>Logos et images</h1>
        </div>

        <div className={styles.panel}>
          <p>
            Choisissez l'établissement ou le médecin dont vous gérez la bibliothèque. Les logos d'un établissement sont
            partagés par ses médecins et son directeur.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <OwnerSelect value={proprietaire} onChange={setProprietaire} />
          </div>

          {cible ? (
            <PdfImageLibrary key={`${cible.owner_type}-${cible.owner_id}`} api={superAdminPdfApi(cible)} />
          ) : (
            <p>Sélectionnez un propriétaire pour voir sa bibliothèque.</p>
          )}
        </div>
      </div>
    </>
  );
}
