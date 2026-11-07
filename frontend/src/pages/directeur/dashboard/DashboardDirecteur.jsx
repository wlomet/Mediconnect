import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import axiosInstance from "../../../api/axios";
import styles from "./DashboardDirecteur.module.css";
import DirectorNavbar from "../utils/navbar";

const DashboardDirecteur = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hopital, setHopital] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get("/directeur/dashboard");
      console.log("Dashboard response:", response.data);

      // Récupérer les statistiques
      const statsResponse = await axiosInstance.get("/directeur/stats");
      setStats(statsResponse.data.stats);

      // Récupérer l'hôpital
      const hopitalResponse = await axiosInstance.get("/directeur/hopital");
      setHopital(hopitalResponse.data.hopital);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        alert("Accès refusé");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <>
      <DirectorNavbar />
      <div className={styles.container}>
        {/* Informations Hôpital */}
        {hopital && (
          <div className={styles.hopitalInfo}>
            <div className={styles.hopitalCard}>
              <h3 className={styles.hopitalName}>{hopital.name}</h3>
              <div className={styles.hopitalDetails}>
                <p>
                  <strong>Adresse:</strong> {hopital.adresse}
                </p>
                <p>
                  <strong>Téléphone:</strong> {hopital.telephone}
                </p>
                <p>
                  <strong>Ville:</strong> {hopital.ville}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.cardGray1}`}>
            <h3 className={styles.statCardTitle}>Total Utilisateurs</h3>
            <p className={styles.statValue}>{stats?.total_users || 0}</p>
          </div>
          <div className={`${styles.statCard} ${styles.cardGray2}`}>
            <h3 className={styles.statCardTitle}>Total Médecins</h3>
            <p className={styles.statValue}>{stats?.total_medecins || 0}</p>
          </div>
          <div className={`${styles.statCard} ${styles.cardGray3}`}>
            <h3 className={styles.statCardTitle}>Rendez-vous du mois</h3>
            <p className={styles.statValue}>{stats?.total_rdv_mois || 0}</p>
          </div>
          <div className={`${styles.statCard} ${styles.cardGray4}`}>
            <h3 className={styles.statCardTitle}>Directeurs</h3>
            <p className={styles.statValue}>{stats?.total_directeurs || 0}</p>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.overviewGrid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Résumé du système</h3>
              <div className={styles.summaryList}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Utilisateurs actifs</span>
                  <span className={styles.summaryValue}>{stats?.total_users || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Médecins enregistrés</span>
                  <span className={styles.summaryValue}>{stats?.total_medecins || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Rendez-vous total</span>
                  <span className={styles.summaryValue}>{stats?.total_rdv || 0}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Directeurs</span>
                  <span className={styles.summaryValue}>{stats?.total_directeurs || 0}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Actions rapides</h3>
              <div className={styles.actionsGrid}>
                <button
                  onClick={() => navigate("/directeur/create-users")}
                  className={styles.actionBtn}
                >
                  + Ajouter du Personnel
                </button>
                <button
                  onClick={() => navigate("/directeur/hopital")}
                  className={styles.actionBtn}
                >
                  Configuration hôpital
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardDirecteur;
