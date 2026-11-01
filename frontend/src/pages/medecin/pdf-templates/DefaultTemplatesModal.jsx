import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PdfImageLibrary from "./PdfImageLibrary";
import styles from "./DefaultTemplatesModal.module.css";

const TYPE_LABELS = { ordonnance: "ordonnance", facture: "facture" };

export default function DefaultTemplatesModal({ api, basePath, missingTypes, onClose }) {
  const navigate = useNavigate();
  const [logo, setLogo] = useState(null);
  const [saving, setSaving] = useState(false);

  const labels = missingTypes.map((type) => TYPE_LABELS[type]).join(" et ");

  const handleStart = async () => {
    if (!logo) return;

    try {
      setSaving(true);
      const created = [];
      for (const type of missingTypes) {
        created.push(await api.createFromDefault({ type, pdf_image_id: logo.id }));
      }
      toast.success("Modèles par défaut créés");
      navigate(`${basePath}/${created[0].id}`);
    } catch (error) {
      toast.error(
        error.response?.data?.errors?.pdf_image_id?.[0] || error.response?.data?.message || "Création impossible"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2 className={styles.title}>Modèle par défaut manquant</h2>
        <p className={styles.text}>
          Aucun modèle de {labels} n'est défini. Choisissez simplement un logo : les modèles par défaut
          seront créés automatiquement et vous pourrez les personnaliser.
        </p>

        <PdfImageLibrary api={api} type="logo" selectedId={logo?.id ?? null} onUse={setLogo} />

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>
            Plus tard
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleStart} disabled={!logo || saving}>
            {saving ? "Création..." : "Commencer le remplissage"}
          </button>
        </div>
      </div>
    </div>
  );
}
