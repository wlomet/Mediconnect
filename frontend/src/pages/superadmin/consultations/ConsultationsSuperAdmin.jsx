import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import ConsultationsDataTable from "../../../components/ConsultationsDataTable";
import styles from "../SuperAdminPages.module.css";
import consultationStyles from "./ConsultationsSuperAdmin.module.css";

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "abandonnee", libelle: "Abandonnées" },
];

const ConsultationsSuperAdmin = () => {
  const [hopitaux, setHopitaux] = useState([]);
  const [hopitalId, setHopitalId] = useState("");
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    superAdminApi
      .listActeurs()
      .then((data) => setHopitaux(data.hopitaux))
      .catch(() => toast.error("Impossible de charger les établissements"));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Consultations</h1>
          <p className={styles.subtitle}>Toutes les consultations de l'application. Lecture seule.</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.toolbar}>
          <div className={consultationStyles.tabs}>
            {FILTRES.map((f) => (
              <button
                key={f.valeur || "toutes"}
                type="button"
                className={`${consultationStyles.tab} ${filtre === f.valeur ? consultationStyles.tabActive : ""}`}
                onClick={() => setFiltre(f.valeur)}
              >
                {f.libelle}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            Établissement
            <select className={styles.input} value={hopitalId} onChange={(e) => setHopitalId(e.target.value)}>
              <option value="">Tous les établissements</option>
              {hopitaux.map((hopital) => (
                <option key={hopital.id} value={hopital.id}>
                  {hopital.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.tableWrapper}>
          <ConsultationsDataTable racine="/super-admin" statut={filtre} hopitalId={hopitalId} avecEtablissement />
        </div>
      </section>
    </div>
  );
};

export default ConsultationsSuperAdmin;
