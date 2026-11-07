import { useEffect, useState } from "react";
import { Eye, Users, Stethoscope, Building2 } from "lucide-react";
import { statistiquesApi } from "../../api/statistiquesApi";
import PublicLayout from "./PublicLayout";
import styles from "./PublicPage.module.css";

const INDICATEURS = [
  { cle: "visiteurs_aujourdhui", label: "Visiteurs aujourd'hui", icone: Eye },
  { cle: "comptes_clients", label: "Comptes patients", icone: Users },
  { cle: "medecins_verifies_actifs", label: "Médecins vérifiés et actifs", icone: Stethoscope },
  { cle: "etablissements", label: "Établissements", icone: Building2 },
];

export default function Statistiques() {
  const [statistiques, setStatistiques] = useState({});

  useEffect(() => {
    statistiquesApi
      .getStatistiques()
      .then(setStatistiques)
      .catch((error) => console.error("Erreur lors du chargement des statistiques:", error));
  }, []);

  return (
    <PublicLayout>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Statistiques</h1>
            <p className={styles.heroSubtitle}>MediConnect en chiffres.</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.grid}>
            {INDICATEURS.map(({ cle, label, icone: Icone }) => (
              <div key={cle} className={styles.card}>
                <div className={styles.cardIconWrapper}>
                  <Icone className={styles.cardIcon} />
                </div>
                <div className={styles.statNumber}>{statistiques[cle] ?? "—"}</div>
                <h3 className={styles.cardTitle}>{label}</h3>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
