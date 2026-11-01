import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavbarMedecin from "../components/NavbarMedecin";
import styles from "./DashboardMedecin.module.css";
import MedecinLiaisons from "../liaisons/MedecinLiaisons";
import ModalNouveauRendezVous from "./modals/ModalNouveauRendezVous";
import ModalDemarrerConsultation from "../consultations/ModalDemarrerConsultation";
import api from "../../../api/axios";

const DashboardMedecin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewRdvModal, setShowNewRdvModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [medecinInfo, setMedecinInfo] = useState(null);
  const [agendaPeriod, setAgendaPeriod] = useState("today");
  const [weekAppointments, setWeekAppointments] = useState([]);

  // Charger les données des rendez-vous au montage du composant
  useEffect(() => {
    const loadAppointmentsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Récupérer les rendez-vous d'aujourd'hui
        const todayResponse = await api.get("/medecin/rendez-vous/today");
        setTodayAppointments(todayResponse.data.rendez_vous || []);

        // Récupérer tous les rendez-vous pour l'agenda de la semaine
        const allResponse = await api.get("/medecin/rendez-vous");
        const allRdv = allResponse.data.rendez_vous || [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Semaine courante (lundi 00:00 à lundi suivant 00:00)
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
        const startOfNextWeek = new Date(startOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
        setWeekAppointments(
          allRdv
            .filter((rdv) => {
              const date = new Date(rdv.date_debut);
              return date >= startOfWeek && date < startOfNextWeek;
            })
            .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))
        );

        // Récupérer les infos du médecin
        const medecinResponse = await api.get("/medecin/profile");
        setMedecinInfo(medecinResponse.data);
      } catch (err) {
        console.error("Erreur lors du chargement des rendez-vous:", err);
        setError("Impossible de charger les rendez-vous");
      } finally {
        setLoading(false);
      }
    };

    loadAppointmentsData();
  }, []);

  useEffect(() => {
    api
      .get("/medecin/dashboard/stats")
      .then((response) => setStats(response.data))
      .catch((err) => {
        console.error("Erreur lors du chargement des compteurs:", err);
        setStatsError(true);
      });
  }, []);

  const displayedAppointments = agendaPeriod === "today" ? todayAppointments : weekAppointments;

  const renderStatValue = (key) => {
    if (statsError) return "ERROR";
    if (!stats) return <span className={styles.statSpinner} role="status" aria-label="Chargement" />;
    return stats[key];
  };

  const formatAppointmentDate = (value) =>
    new Date(value).toLocaleString("fr-FR",
      agendaPeriod === "today"
        ? { hour: "2-digit", minute: "2-digit" }
        : { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
    );

  return (
    <div className={styles.container}>
      {/* Utilisation du composant Navbar */}
      <NavbarMedecin />

      {/* Contenu principal */}
      <main className={styles.main}>
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "dashboard" ? styles.active : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Tableau de bord
            </button>
            {medecinInfo && !medecinInfo?.hopital_id && (
              <button
                className={`${styles.tab} ${activeTab === "secretaires" ? styles.active : ""}`}
                onClick={() => setActiveTab("secretaires")}
              >
                Liaisons Secrétaires
              </button>
            )}
          </div>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "dashboard" && (
            <div className={styles.dashboard}>
              <h2 className={styles.dashboardTitle}>Tableau de Bord Médical</h2>

              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.cardGreen}`}>
                  <h3 className={`${styles.statCardTitle} ${styles.titleGreen}`}>
                    Rendez-vous Aujourd'hui
                  </h3>
                  <p className={`${styles.statValue} ${styles.valueGreen}`}>{renderStatValue("rendez_vous_aujourdhui")}</p>
                </div>
                <div className={`${styles.statCard} ${styles.cardBlue}`}>
                  <h3 className={`${styles.statCardTitle} ${styles.titleBlue}`}>
                    Patients en Attente
                  </h3>
                  <p className={`${styles.statValue} ${styles.valueBlue}`}>
                    {renderStatValue("patients_en_attente")}
                  </p>
                </div>
                <div className={`${styles.statCard} ${styles.cardPurple}`}>
                  <h3 className={`${styles.statCardTitle} ${styles.titlePurple}`}>
                    Consultations du Mois
                  </h3>
                  <p className={`${styles.statValue} ${styles.valuePurple}`}>{renderStatValue("consultations_mois")}</p>
                </div>
                <div className={`${styles.statCard} ${styles.cardOrange}`}>
                  <h3 className={`${styles.statCardTitle} ${styles.titleOrange}`}>
                    Rendez-vous à Valider
                  </h3>
                  <p className={`${styles.statValue} ${styles.valueOrange}`}>{renderStatValue("rendez_vous_a_valider")}</p>
                </div>
              </div>

              <div className={styles.contentGrid}>
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      {agendaPeriod === "today" ? "Rendez-vous du Jour" : "Rendez-vous de la Semaine"}
                    </h3>
                    <div className={styles.periodToggle}>
                      <button
                        className={`${styles.periodButton} ${agendaPeriod === "today" ? styles.periodButtonActive : ""}`}
                        onClick={() => setAgendaPeriod("today")}
                      >
                        Jour
                      </button>
                      <button
                        className={`${styles.periodButton} ${agendaPeriod === "week" ? styles.periodButtonActive : ""}`}
                        onClick={() => setAgendaPeriod("week")}
                      >
                        Semaine
                      </button>
                    </div>
                  </div>
                  <ul className={styles.appointmentsList}>
                    {loading ? (
                      <li className={styles.appointmentItem}>
                        <span>Chargement des rendez-vous...</span>
                      </li>
                    ) : error ? (
                      <li className={styles.appointmentItem}>
                        <span style={{ color: "red" }}>{error}</span>
                      </li>
                    ) : displayedAppointments.length > 0 ? (
                      displayedAppointments.map((appointment) => (
                        <li key={appointment.id} className={styles.appointmentItem}>
                          <span className={styles.appointmentTime}>
                            {formatAppointmentDate(appointment.date_debut)}{" "}
                            - {appointment.name}
                          </span>
                          <span
                            className={`${styles.badge} ${
                              appointment.statut === "confirmé"
                                ? styles.badgeConfirmed
                                : appointment.statut === "en_attente"
                                  ? styles.badgePending
                                  : appointment.statut === "annulé"
                                    ? styles.badgeCancelled
                                    : styles.badgePending
                            }`}
                          >
                            {appointment.statut === "confirmé"
                              ? "Confirmé"
                              : appointment.statut === "en_attente"
                                ? "En attente"
                                : appointment.statut === "annulé"
                                  ? "Annulé"
                                  : appointment.statut}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className={styles.appointmentItem}>
                        <span>
                          {agendaPeriod === "today"
                            ? "Aucun rendez-vous aujourd'hui"
                            : "Aucun rendez-vous cette semaine"}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Actions Rapides</h3>
                  <div className={styles.actionsGrid}>
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonGreen}`}
                      onClick={() => setShowConsultationModal(true)}
                    >
                      Démarrer une consultation
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonGreen}`}
                      onClick={() => setShowNewRdvModal(true)}
                    >
                      Nouveau Rendez-vous
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonBlue}`}
                      onClick={() => navigate("/medecin/planning")}
                    >
                      Voir le Planning
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.actionButtonBlue}`}
                      onClick={() => navigate("/medecin/pdf-templates")}
                    >
                      Modèles de documents
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "secretaires" && <MedecinLiaisons />}
        </div>
      </main>

      {showNewRdvModal && <ModalNouveauRendezVous onClose={() => setShowNewRdvModal(false)} />}

      {showConsultationModal && (
        <ModalDemarrerConsultation onClose={() => setShowConsultationModal(false)} />
      )}
    </div>
  );
};

export default DashboardMedecin;
