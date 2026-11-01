import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { NAV_GROUPES } from "./superAdminNavigation";
import styles from "./SuperAdminAccesRapides.module.css";

// Cartes de navigation vers chaque page superadmin (la page du tableau de bord est exclue)
const SuperAdminAccesRapides = () => (
  <section className={styles.wrapper}>
    <h2 className={styles.titre}>Accès rapide</h2>

    {NAV_GROUPES.map((groupe) => {
      const Icon = groupe.icon;
      return (
        <div key={groupe.id} className={styles.groupe}>
          <h3 className={styles.groupeTitre}>
            <Icon size={18} />
            <span>{groupe.label}</span>
          </h3>

          <div className={styles.grille}>
            {groupe.liens.map((lien) => {
              const LienIcon = lien.icon;
              return (
                <Link key={lien.to} to={lien.to} className={styles.carte}>
                  <span className={styles.icone}>
                    <LienIcon size={22} />
                  </span>
                  <span className={styles.texte}>
                    <span className={styles.nom}>{lien.label}</span>
                    <span className={styles.description}>{lien.description}</span>
                  </span>
                  <ArrowRight size={18} className={styles.fleche} />
                </Link>
              );
            })}
          </div>
        </div>
      );
    })}
  </section>
);

export default SuperAdminAccesRapides;
