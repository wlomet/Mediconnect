import { useEffect, useState } from "react";
import NavbarGestionnaire from "../components/NavbarGestionnaire";
import api from "../../../api/axios";
import { exporterConsultations } from "../../../api/consultationsListeApi";
import ConsultationsDataTable from "../../../components/ConsultationsDataTable";
import PanneauExport from "../../../components/PanneauExport";
import styles from "./ConsultationsGestionnaire.module.css";

const COULEUR = "#7c3aed";

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "abandonnee", libelle: "Abandonnées" },
];

export default function ConsultationsGestionnaire() {
  const [medecins, setMedecins] = useState([]);
  const [medecinId, setMedecinId] = useState("");
  const [filtre, setFiltre] = useState("");
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    api
      .get("/gestionnaire/liaisons/medecins")
      .then((res) => setMedecins(res.data.medecins || []))
      .catch((err) => console.error("Erreur lors du chargement des médecins :", err));
  }, []);

  const exporter = (options) => exporterConsultations("/gestionnaire", { ...options, statut: filtre, medecinId });

  return (
    <div className={styles.page}>
      <NavbarGestionnaire />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Consultations</h1>
            <p className={styles.subtitle}>Consultations des médecins liés à votre compte. Lecture seule.</p>
          </div>
          <button type="button" className={styles.boutonSecondaire} onClick={() => setShowExport((v) => !v)}>
            Exporter
          </button>
        </header>

        {showExport && (
          <div className={styles.export}>
            <PanneauExport onExporter={exporter} couleur={COULEUR} />
          </div>
        )}

        <div className={styles.barre}>
          <div className={styles.tabs}>
            {FILTRES.map((f) => (
              <button
                key={f.valeur || "toutes"}
                type="button"
                className={`${styles.tab} ${filtre === f.valeur ? styles.tabActive : ""}`}
                onClick={() => setFiltre(f.valeur)}
              >
                {f.libelle}
              </button>
            ))}
          </div>

          <label className={styles.champ}>
            Médecin
            <select value={medecinId} onChange={(e) => setMedecinId(e.target.value)} className={styles.select}>
              <option value="">Tous les médecins</option>
              {medecins.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.card}>
          <ConsultationsDataTable racine="/gestionnaire" statut={filtre} medecinId={medecinId} />
        </div>
      </main>
    </div>
  );
}
