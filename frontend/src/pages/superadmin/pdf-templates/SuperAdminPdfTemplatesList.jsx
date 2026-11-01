import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import NouveauModeleModal from "./NouveauModeleModal";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../../medecin/pdf-templates/PdfTemplatesList.module.css";

const TYPE_LABELS = { ordonnance: "Ordonnance", facture: "Facture" };
const PROPRIETAIRE_LABELS = { hopital: "Établissement", medecin: "Médecin" };

export default function SuperAdminPdfTemplatesList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterProprietaire, setFilterProprietaire] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const charger = useCallback(async () => {
    const params = {};
    if (filterType) params.type = filterType;
    if (filterProprietaire) params.owner_type = filterProprietaire;

    try {
      setLoading(true);
      setTemplates(await superAdminApi.listPdfTemplates(params));
    } catch {
      toast.error("Impossible de charger les modèles");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterProprietaire]);

  useEffect(() => {
    charger();
  }, [charger]);

  const supprimer = async (template) => {
    const result = await Swal.fire({
      title: "Supprimer ce modèle ?",
      text: "Les documents déjà archivés restent disponibles.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;

    try {
      await superAdminApi.deletePdfTemplate(template.id);
      toast.success("Modèle supprimé");
      charger();
    } catch {
      toast.error("Suppression impossible");
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Modèles de documents</h1>
            <p className={styles.subtitle}>Ordonnances et factures attribuées aux établissements et aux médecins</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => navigate("/super-admin/pdf-templates/logos")}>
              Logos et images
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => setShowCreate(true)}>
              Nouveau modèle
            </button>
          </div>
        </div>

        <div className={styles.filters}>
          <select className={styles.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="ordonnance">Ordonnances</option>
            <option value="facture">Factures</option>
          </select>
          <select
            className={styles.select}
            value={filterProprietaire}
            onChange={(e) => setFilterProprietaire(e.target.value)}
          >
            <option value="">Tous les propriétaires</option>
            <option value="hopital">Établissements</option>
            <option value="medecin">Médecins</option>
          </select>
        </div>

        {loading ? (
          <p className={styles.empty}>Chargement...</p>
        ) : templates.length === 0 ? (
          <p className={styles.empty}>Aucun modèle.</p>
        ) : (
          <div className={styles.grid}>
            {templates.map((template) => (
              <div key={template.id} className={styles.card}>
                <span className={`${styles.badge} ${styles[template.type]}`}>{TYPE_LABELS[template.type]}</span>
                <h3 className={styles.cardTitle}>{template.nom}</h3>
                <p className={styles.meta}>
                  {PROPRIETAIRE_LABELS[template.proprietaire_type]} : {template.proprietaire_nom ?? "—"}
                </p>
                <p className={styles.meta}>
                  Modifié le {new Date(template.updated_at).toLocaleDateString("fr-FR")}
                </p>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => navigate(`/super-admin/pdf-templates/${template.id}`)}
                  >
                    Modifier
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => supprimer(template)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <NouveauModeleModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
