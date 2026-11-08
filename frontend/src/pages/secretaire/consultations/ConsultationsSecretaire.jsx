import { useEffect, useState } from "react";
import NavbarSecretaire from "../components/NavbarSecretaire";
import api from "../../../api/axios";
import ConsultationsDataTable from "../../../components/ConsultationsDataTable";
import styles from "./ConsultationsSecretaire.module.css";

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "abandonnee", libelle: "Abandonnées" },
];

export default function ConsultationsSecretaire() {
  const [medecins, setMedecins] = useState([]);
  const [medecinId, setMedecinId] = useState("");
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    api
      .get("/secretaire/liaisons/medecins")
      .then((res) => setMedecins(res.data.medecins || []))
      .catch((err) => console.error("Erreur lors du chargement des médecins :", err));
  }, []);

  return (
    <div className={styles.page}>
      <NavbarSecretaire />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Consultations</h1>
            <p className={styles.subtitle}>Consultations des médecins liés à votre compte. Lecture seule.</p>
          </div>
        </header>

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
          <ConsultationsDataTable racine="/secretaire" statut={filtre} medecinId={medecinId} />
        </div>
      </main>
    </div>
  );
}
