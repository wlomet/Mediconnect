import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import NavbarSecretaire from "../components/NavbarSecretaire";
import styles from "./DashboardSecretaire.module.css";
import SecretaireLiaisons from "../liaisons/SecretaireLiaisons";
import ModalUpdateRendezVous from "./modals/ModalUpdateRendezVous";
import ModalRendezVousAValider from "./modals/ModalRendezVousAValider";
import ModalMedecinManage from "./modals/ModalMedecinManage";

const DashboardSecretaire = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [medecins, setMedecins] = useState([]);
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  const [rendezVous, setRendezVous] = useState([]);
  const [rdvAujourdhui, setRdvAujourdhui] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [secretaireInfo, setSecretaireInfo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRendezVousForEdit, setSelectedRendezVousForEdit] = useState(null);
  const [showMedecinManageModal, setShowMedecinManageModal] = useState(false);
  const [selectedMedecinForManagement, setSelectedMedecinForManagement] = useState(null);
  const [showListeAValider, setShowListeAValider] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchRdvAujourdhui();
    fetchSecretaireInfo();
  }, []);

  const fetchSecretaireInfo = async () => {
    try {
      const response = await axiosInstance.get("/secretaire/profile");
      console.log("Secretaire profile response:", response.data);
      setSecretaireInfo(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des infos secrétaire:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get("/secretaire/dashboard");
      setStats(response.data.stats);
      setMedecins(response.data.medecins);
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

  const fetchRdvAujourdhui = async () => {
    try {
      const response = await axiosInstance.get("/secretaire/rendez-vous/today");
      setRdvAujourdhui(response.data.rendez_vous);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const fetchMedecinRendezVous = async (medecinId) => {
    try {
      const response = await axiosInstance.get(`/secretaire/rendez-vous/medecin/${medecinId}`);
      setRendezVous(response.data.rendez_vous);
      setSelectedMedecin(response.data.medecin);
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const getStatutBadgeClass = (statut) => {
    switch (statut) {
      case "confirmé":
        return styles.badgeConfirmed;
      case "en_attente":
        return styles.badgePending;
      case "annulé":
        return styles.badgeCancelled;
      default:
        return styles.badgePending;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <>
      <NavbarSecretaire />
      <div className={styles.container}>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.cardGreen}`}>
          <h3 className={styles.statCardTitle}>Médecins</h3>
          <p className={styles.statValue}>{stats?.total_medecins || 0}</p>
        </div>
        <div className={`${styles.statCard} ${styles.cardBlue}`}>
          <h3 className={styles.statCardTitle}>RDV Aujourd'hui</h3>
          <p className={styles.statValue}>{stats?.total_rdv_aujourdhui || 0}</p>
        </div>
        <div className={`${styles.statCard} ${styles.cardPurple}`}>
          <h3 className={styles.statCardTitle}>RDV Cette Semaine</h3>
          <p className={styles.statValue}>{stats?.total_rdv_semaine || 0}</p>
        </div>
        <div className={`${styles.statCard} ${styles.cardOrange}`}>
          <h3 className={styles.statCardTitle}>Rendez-vous à Valider</h3>
          <p className={styles.statValue}>{stats?.rendez_vous_a_valider || 0}</p>
          {stats?.rendez_vous_a_valider > 0 && (
            <div className={styles.statDetail}>
              <span>dont {stats.rendez_vous_a_valider_plus_2_semaines} dans plus de 2 semaines</span>
              <button type="button" className={styles.statLink} onClick={() => setShowListeAValider(true)}>
                Voir liste
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Vue d'ensemble
        </button>
        <button
          className={`${styles.tab} ${activeTab === "medecins" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("medecins")}
        >
          Médecins
        </button>
        <button
          className={`${styles.tab} ${activeTab === "rdv" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("rdv")}
        >
          Rendez-vous du jour
        </button>
        {secretaireInfo && !secretaireInfo?.hopital_id && (
          <button
            className={`${styles.tab} ${activeTab === "liaisons" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("liaisons")}
          >
            Liaisons
          </button>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Vue d'ensemble */}
        {activeTab === "overview" && (
          <div className={styles.overviewGrid}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Rendez-vous d'aujourd'hui</h3>
              {rdvAujourdhui.length === 0 ? (
                <p className={styles.emptyMessage}>Aucun rendez-vous aujourd'hui</p>
              ) : (
                <ul className={styles.appointmentsList}>
                  {rdvAujourdhui.slice(0, 5).map((rdv) => (
                    <li
                      key={rdv.id}
                      className={styles.appointmentItem}
                      onClick={() => {
                        setSelectedRendezVousForEdit(rdv);
                        setShowEditModal(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <span className={styles.appointmentTime}>
                        {new Date(rdv.date_debut).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        - {rdv.name}
                      </span>
                      <div className={styles.appointmentMeta}>
                        <span className={styles.appointmentDoctor}>
                          Dr. {rdv.medecin?.name || "Inconnu"}
                        </span>
                        {rdv.email && <span className={styles.contactInfo}>{rdv.email}</span>}
                        {rdv.phone && <span className={styles.contactInfo}>{rdv.phone}</span>}
                        <span className={`${styles.badge} ${getStatutBadgeClass(rdv.statut)}`}>
                          {rdv.statut === "confirmé"
                            ? "Confirmé"
                            : rdv.statut === "en_attente"
                              ? "En attente"
                              : rdv.statut === "annulé"
                                ? "Annulé"
                                : rdv.statut}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Médecins disponibles</h3>
              <ul className={styles.medecinsList}>
                {medecins.slice(0, 5).map((medecin) => (
                  <li key={medecin.id} className={styles.medecinItem}>
                    <div>
                      <strong>{medecin.name}</strong>
                      <br />
                      <small className={styles.specialite}>{medecin.specialite}</small>
                    </div>
                    <button
                      className={styles.btnSmall}
                      onClick={() => {
                        setActiveTab("medecins");
                        fetchMedecinRendezVous(medecin.id);
                      }}
                    >
                      Voir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Liste des médecins */}
        {activeTab === "medecins" && (
          <div>
            <h3 className={styles.sectionTitle}>Liste des Médecins</h3>
            <div className={styles.medecinsGrid}>
              {medecins.map((medecin) => (
                <div key={medecin.id} className={styles.medecinCard}>
                  <h4>{medecin.name}</h4>
                  <p className={styles.specialite}>{medecin.specialite}</p>
                  <p className={styles.contact}>{medecin.telephone}</p>
                  <p className={styles.contact}>{medecin.adresse}</p>
                  <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => fetchMedecinRendezVous(medecin.id)}
                        style={{ flex: 1 }}
                      >
                        Voir les rendez-vous
                      </button>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => navigate(`/secretaire/planning?medecin=${medecin.id}`)}
                        style={{ flex: 1 }}
                      >
                        Voir Planning Complet
                      </button>
                    </div>
                    <button
                      className={styles.btnManage}
                      onClick={() => {
                        setSelectedMedecinForManagement(medecin);
                        setShowMedecinManageModal(true);
                      }}
                    >
                      Gérer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedMedecin && (
              <div className={styles.section} style={{ marginTop: "2rem" }}>
                <h3 className={styles.sectionTitle}>Rendez-vous de Dr. {selectedMedecin.name}</h3>
                {rendezVous.length === 0 ? (
                  <p className={styles.emptyMessage}>Aucun rendez-vous</p>
                ) : (
                  <ul className={styles.appointmentsList}>
                    {rendezVous.map((rdv) => (
                      <li
                        key={rdv.id}
                        className={styles.appointmentItem}
                        onClick={() => {
                          setSelectedRendezVousForEdit(rdv);
                          setShowEditModal(true);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <div>
                          <span className={styles.appointmentTime}>
                            {new Date(rdv.date_debut).toLocaleDateString("fr-FR")} -{" "}
                            {new Date(rdv.date_debut).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className={styles.appointmentDetail}>
                            {rdv.patient.name} - {rdv.motif}
                          </span>
                          {rdv.email && <span className={styles.contactInfo}>{rdv.email}</span>}
                          {rdv.phone && <span className={styles.contactInfo}>{rdv.phone}</span>}
                        </div>
                        <span className={`${styles.badge} ${getStatutBadgeClass(rdv.statut)}`}>
                          {rdv.statut}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rendez-vous du jour */}
        {activeTab === "rdv" && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Tous les rendez-vous d'aujourd'hui</h3>
            {rdvAujourdhui.length === 0 ? (
              <p className={styles.emptyMessage}>Aucun rendez-vous aujourd'hui</p>
            ) : (
              <ul className={styles.appointmentsList}>
                {rdvAujourdhui.map((rdv) => (
                  <li
                    key={rdv.id}
                    className={styles.appointmentItem}
                    onClick={() => {
                      setSelectedRendezVousForEdit(rdv);
                      setShowEditModal(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <span className={styles.appointmentTime}>
                      {new Date(rdv.date_debut).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      - {rdv.name}
                    </span>
                    <div className={styles.appointmentMeta}>
                      <span className={styles.appointmentDoctor}>
                        Dr. {rdv.medecin?.name || "Inconnu"}
                      </span>
                      <span className={styles.motif}>{rdv.motif}</span>
                      {rdv.email && <span className={styles.contactInfo}>{rdv.email}</span>}
                      {rdv.phone && <span className={styles.contactInfo}>{rdv.phone}</span>}
                      <span className={`${styles.badge} ${getStatutBadgeClass(rdv.statut)}`}>
                        {rdv.statut === "confirmé"
                          ? "Confirmé"
                          : rdv.statut === "en_attente"
                            ? "En attente"
                            : rdv.statut === "annulé"
                              ? "Annulé"
                              : rdv.statut}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Liaisons */}
        {activeTab === "liaisons" && <SecretaireLiaisons />}
      </div>

      {showListeAValider && (
        <ModalRendezVousAValider
          onClose={() => setShowListeAValider(false)}
          onUpdate={() => {
            fetchDashboardData();
            fetchRdvAujourdhui();
          }}
        />
      )}

      {/* Modal Edit Rendez-vous */}
      {showEditModal && selectedRendezVousForEdit && (
        <ModalUpdateRendezVous
          rendezVous={selectedRendezVousForEdit}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRendezVousForEdit(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRendezVousForEdit(null);
            fetchRdvAujourdhui();
            if (selectedMedecin) {
              fetchMedecinRendezVous(selectedMedecin.id);
            }
          }}
        />
      )}

      {/* Modal Manage Medecin */}
      {showMedecinManageModal && selectedMedecinForManagement && (
        <ModalMedecinManage
          medecin={selectedMedecinForManagement}
          onClose={() => {
            setShowMedecinManageModal(false);
            setSelectedMedecinForManagement(null);
          }}
          onSuccess={() => {
            setShowMedecinManageModal(false);
            setSelectedMedecinForManagement(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
    </>
  );
};

export default DashboardSecretaire;
