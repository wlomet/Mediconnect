import { useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import InactivityTable from "../../../components/InactivityTable";
import styles from "./DashboardAdmin.module.css";

const DashboardAdmin = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      {/* Navbar Admin */}
      <Navbar />

      {/* Contenu principal */}
      <main className={styles.main}>
        <div className={styles.dashboard}>
          <h2 className={styles.dashboardTitle}>Tableau de Bord Administratif</h2>

          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.cardRed}`}>
              <h3 className={`${styles.statCardTitle} ${styles.titleRed}`}>Utilisateurs Totaux</h3>
              <p className={`${styles.statValue} ${styles.valueRed}`}>1,247</p>
            </div>
            <div className={`${styles.statCard} ${styles.cardBlue}`}>
              <h3 className={`${styles.statCardTitle} ${styles.titleBlue}`}>Médecins</h3>
              <p className={`${styles.statValue} ${styles.valueBlue}`}>48</p>
            </div>
            <div className={`${styles.statCard} ${styles.cardGreen}`}>
              <h3 className={`${styles.statCardTitle} ${styles.titleGreen}`}>
                Rendez-vous du Jour
              </h3>
              <p className={`${styles.statValue} ${styles.valueGreen}`}>89</p>
            </div>
            <div className={`${styles.statCard} ${styles.cardPurple}`}>
              <h3 className={`${styles.statCardTitle} ${styles.titlePurple}`}>Alertes Système</h3>
              <p className={`${styles.statValue} ${styles.valuePurple}`}>2</p>
            </div>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Activité Récente</h3>
              <ul className={styles.activityList}>
                <li className={styles.activityItem}>
                  <span className={styles.activityText}>Nouvel utilisateur inscrit</span>
                  <span className={styles.activityTime}>il y a 5 min</span>
                </li>
                <li className={styles.activityItem}>
                  <span className={styles.activityText}>Mise à jour système effectuée</span>
                  <span className={styles.activityTime}>il y a 1h</span>
                </li>
                <li className={styles.activityItem}>
                  <span className={styles.activityText}>Rapport mensuel généré</span>
                  <span className={styles.activityTime}>il y a 2h</span>
                </li>
              </ul>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Actions Administratives</h3>
              <div className={styles.actionsGrid}>
                <button className={`${styles.actionButton} ${styles.actionButtonRed}`}>
                  Gérer Utilisateurs
                </button>
                <button className={`${styles.actionButton} ${styles.actionButtonBlue}`}>
                  Voir Statistiques
                </button>
                <button className={`${styles.actionButton} ${styles.actionButtonGreen}`}>
                  Paramètres Système
                </button>
                <button className={`${styles.actionButton} ${styles.actionButtonPurple}`}>
                  Générer Rapports
                </button>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Comptes inactifs à supprimer</h3>
            <InactivityTable endpoint="/admin/inactivity" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;
