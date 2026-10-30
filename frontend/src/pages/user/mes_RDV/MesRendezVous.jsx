import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../api/axios";
import styles from "./MesRendezVous.module.css";
import { Calendar, User, FileText } from "lucide-react";
import ModalDetailRendezVous from "./ModalDetailRendezVous";
import UserNavbar from "../components/UserNavbar";

const MesRendezVous = () => {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, past
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await api.get("/client/rendez-vous");
        const data = response.data.rendez_vous || [];
        setAppointments(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des rendez-vous:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAppointments();
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

  const handleViewDetails = async (appointmentId) => {
    setLoadingDetail(true);
    try {
      const response = await api.get(`/client/rendez-vous/${appointmentId}`);
      setSelectedAppointment(response.data.rendezVous);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getFilteredAppointments = () => {
    const now = new Date();
    switch (filter) {
      case "upcoming":
        return appointments.filter((apt) => new Date(apt.date_debut) > now);
      case "past":
        return appointments.filter((apt) => new Date(apt.date_debut) <= now);
      default:
        return appointments;
    }
  };

  const getStatusBadge = (statut) => {
    const statusConfig = {
      confirmed: { label: "Confirmé", className: styles.statusConfirmed },
      pending: { label: "En attente", className: styles.statusPending },
      cancelled: { label: "Annulé", className: styles.statusCancelled },
      completed: { label: "Complété", className: styles.statusCompleted },
    };
    const config = statusConfig[statut] || { label: statut, className: styles.statusDefault };
    return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
  };

  const filteredAppointments = getFilteredAppointments();

  return (
    <div className={styles.container}>
      <UserNavbar />

      {/* Contenu principal */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.navTitle}>Mes Rendez-vous</h1>
          {/* Filtres */}
          <div className={styles.filters}>
            <button
              className={filter === "all" ? styles.filterActive : styles.filterInactive}
              onClick={() => setFilter("all")}
            >
              Tous ({appointments.length})
            </button>
            <button
              className={filter === "upcoming" ? styles.filterActive : styles.filterInactive}
              onClick={() => setFilter("upcoming")}
            >
              À venir ({appointments.filter((apt) => new Date(apt.date_debut) > new Date()).length})
            </button>
            <button
              className={filter === "past" ? styles.filterActive : styles.filterInactive}
              onClick={() => setFilter("past")}
            >
              Passés ({appointments.filter((apt) => new Date(apt.date_debut) <= new Date()).length})
            </button>
          </div>

          {/* Liste des rendez-vous */}
          {loading ? (
            <div className={styles.loading}>Chargement des rendez-vous...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className={styles.empty}>
              <Calendar size={48} className={styles.emptyIcon} />
              <p>Aucun rendez-vous {filter !== "all" ? "pour ce filtre" : "programmé"}</p>
            </div>
          ) : (
            <div className={styles.appointmentsList}>
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className={styles.appointmentCard}>
                  <div className={styles.appointmentHeader}>
                    <div className={styles.appointmentTitle}>
                      <Calendar size={20} />
                      <span>{formatDate(apt.date_debut)}</span>
                    </div>
                    {getStatusBadge(apt.statut)}
                  </div>

                  <div className={styles.appointmentBody}>
                    <div className={styles.infoRow}>
                      <User size={18} />
                      <span>
                        <strong>Médecin:</strong> Dr. {apt.medecin?.name || "Non assigné"}
                      </span>
                    </div>

                    {apt.motif && (
                      <div className={styles.infoRow}>
                        <FileText size={18} />
                        <span>
                          <strong>Motif:</strong> {apt.motif}
                        </span>
                      </div>
                    )}

                    {apt.notes && (
                      <div className={styles.infoRow}>
                        <span>
                          <strong>Notes:</strong> {apt.notes}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.appointmentFooter}>
                    <button
                      className={styles.viewButton}
                      onClick={() => handleViewDetails(apt.id)}
                      disabled={loadingDetail}
                    >
                      {loadingDetail ? "Chargement..." : "Voir les détails"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de détails */}
      {selectedAppointment && (
        <ModalDetailRendezVous
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          loading={loadingDetail}
        />
      )}
    </div>
  );
};

export default MesRendezVous;
