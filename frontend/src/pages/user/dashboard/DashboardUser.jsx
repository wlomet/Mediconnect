import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import styles from "./DashboardUser.module.css";
import SearchMedecin from "../../public/rdv/SearchMedecin";
import { toast } from "react-toastify";

const DashboardUser = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [nextAppointment, setNextAppointment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNextAppointment = async () => {
      try {
        const response = await api.get("/client/rendez-vous");
        const appointments = response.data.rendez_vous || [];

        // Filtrer les rendez-vous futurs et trouver le plus proche
        const now = new Date();
        const futureAppointments = appointments
          .filter((apt) => new Date(apt.date_debut) > now)
          .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

        if (futureAppointments.length > 0) {
          setNextAppointment(futureAppointments[0]);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des rendez-vous:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchNextAppointment();
    }
  }, [user]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDevelopment = (e) => {
    e.preventDefault();
    toast.warning("En développement", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className={styles.container}>
      {/* Navbar Client */}
      <nav className={styles.navbar}>
        <div className={styles.navbarInner}>
          <div className={styles.navbarContent}>
            {/* Logo et titre */}
            <div className={styles.logo}>
              <h1 className={styles.logoTitle}>Espace Client</h1>
            </div>

            {/* Navigation links */}
            <div className={styles.navLinks}>
              <a
                href="#rdv"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/user/mes-rdv");
                }}
              >
                Mes Rendez-vous
              </a>
              <a href="#documents" className={styles.navLink} onClick={handleDevelopment}>
                Mes Documents
              </a>
              <a
                href="#profil"
                className={styles.navLink}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/user/profile");
                }}
              >
                Mon Profil
              </a>
            </div>

            {/* User info et déconnexion */}
            <div className={styles.userSection}>
              <span className={styles.userGreeting}>Bonjour, {user?.name}</span>
              <button onClick={handleLogout} className={styles.logoutButton}>
                <svg
                  className={styles.logoutIcon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className={styles.main}>
        <div className={styles.dashboard}>
          <h2 className={styles.dashboardTitle}>Tableau de Bord Client</h2>

          <div className={styles.cardsGrid}>
            <div className={`${styles.card} ${styles.cardBlue}`}>
              <h3 className={`${styles.cardTitle} ${styles.cardTitleBlue}`}>
                Prochain Rendez-vous
              </h3>
              {loading ? (
                <p className={`${styles.cardText} ${styles.cardTextBlue}`}>Chargement...</p>
              ) : nextAppointment ? (
                <div className={`${styles.cardText} ${styles.cardTextBlue}`}>
                  <p className={styles.appointmentDate}>{formatDate(nextAppointment.date_debut)}</p>
                  <p className={styles.appointmentDoctor}>Dr. {nextAppointment.medecin?.name}</p>
                  {nextAppointment.motif && (
                    <p className={styles.appointmentReason}>{nextAppointment.motif}</p>
                  )}
                </div>
              ) : (
                <p className={`${styles.cardText} ${styles.cardTextBlue}`}>
                  Aucun rendez-vous programmé
                </p>
              )}
            </div>
            <div className={`${styles.card} ${styles.cardGreen}`}>
              <h3 className={`${styles.cardTitle} ${styles.cardTitleGreen}`}>Documents</h3>
              <p className={`${styles.cardText} ${styles.cardTextGreen}`}>
                3 documents disponibles
              </p>
            </div>
            <div className={`${styles.card} ${styles.cardPurple}`}>
              <h3 className={`${styles.cardTitle} ${styles.cardTitlePurple}`}>Messages</h3>
              <p className={`${styles.cardText} ${styles.cardTextPurple}`}>2 messages non lus</p>
            </div>
          </div>

          <div className={styles.actionsSection}>
            <h3 className={styles.actionTitle}>Actions Rapides</h3>
            <div className={styles.actionsContainer}>
              <button className={`${styles.actionButton} ${styles.actionButtonBlue}`}>
                Prendre Rendez-vous
              </button>
              <button
                className={`${styles.actionButton} ${styles.actionButtonGreen}`}
                onClick={handleDevelopment}
              >
                Consulter mes Documents
              </button>
              <button
                className={`${styles.actionButton} ${styles.actionButtonPurple}`}
                onClick={handleDevelopment}
              >
                Contacter le Support
              </button>
            </div>
            <div>
              <SearchMedecin />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardUser;
