import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import OwnerSelect from "./OwnerSelect";
import { superAdminApi, superAdminPdfApi } from "../../../api/superAdminApi";
import styles from "../../medecin/pdf-templates/PdfTemplatesList.module.css";

/**
 * Création d'un modèle prérempli, attribué à un établissement ou à un médecin.
 * Le logo doit provenir de la bibliothèque du propriétaire choisi.
 */
export default function NouveauModeleModal({ onClose }) {
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("ordonnance");
  const [proprietaire, setProprietaire] = useState({ type: "hopital", id: "" });
  const [logos, setLogos] = useState([]);
  const [logoId, setLogoId] = useState("");
  const [chargementLogos, setChargementLogos] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLogoId("");
    setLogos([]);
    if (!proprietaire.id) return undefined;

    let annule = false;
    setChargementLogos(true);
    superAdminPdfApi({ owner_type: proprietaire.type, owner_id: proprietaire.id })
      .listImages("logo")
      .then((images) => {
        if (!annule) setLogos(images);
      })
      .catch(() => toast.error("Impossible de charger les logos"))
      .finally(() => {
        if (!annule) setChargementLogos(false);
      });

    return () => {
      annule = true;
    };
  }, [proprietaire.type, proprietaire.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      const modele = await superAdminApi.createPdfTemplateFromDefault({
        ...(nom.trim() ? { nom: nom.trim() } : {}),
        type,
        pdf_image_id: Number(logoId),
        owner_type: proprietaire.type,
        owner_id: Number(proprietaire.id),
      });
      toast.success("Modèle créé");
      navigate(`/super-admin/pdf-templates/${modele.id}`);
    } catch (error) {
      const erreurs = Object.values(error.response?.data?.errors ?? {})[0]?.[0];
      toast.error(erreurs || error.response?.data?.message || "Création impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className={styles.modalTitle}>Nouveau modèle</h2>

        <label className={styles.label}>
          Nom du modèle (optionnel)
          <input className={styles.input} value={nom} maxLength={255} onChange={(e) => setNom(e.target.value)} />
        </label>

        <label className={styles.label}>
          Type de document
          <select className={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ordonnance">Ordonnance</option>
            <option value="facture">Facture</option>
          </select>
        </label>

        <OwnerSelect value={proprietaire} onChange={setProprietaire} />

        <label className={styles.label}>
          Logo (bibliothèque du propriétaire)
          <select
            className={styles.input}
            value={logoId}
            disabled={!proprietaire.id || chargementLogos}
            onChange={(e) => setLogoId(e.target.value)}
          >
            <option value="">
              {chargementLogos ? "Chargement..." : "-- Choisir --"}
            </option>
            {logos.map((logo) => (
              <option key={logo.id} value={logo.id}>
                {logo.nom}
              </option>
            ))}
          </select>
        </label>

        {proprietaire.id && !chargementLogos && logos.length === 0 && (
          <p className={styles.empty}>Aucun logo pour ce propriétaire. Ajoutez-en un dans « Logos et images ».</p>
        )}

        <div className={styles.cardActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Annuler
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={saving || !proprietaire.id || !logoId}
          >
            {saving ? "Création..." : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
