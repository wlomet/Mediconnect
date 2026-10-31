import { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../../../../context/AuthContext";
import { X, Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../../../api/axios";
import ModalReservationCreneau from "../../planning/modals/ModalReservationCreneau";
import { formatDateKey, getDayName, parseDateKey } from "../../../../utils/dateHelpers";
import styles from "./ModalNouveauRendezVous.module.css";

const ModalNouveauRendezVous = ({ onClose, onSuccess }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [horaires, setHoraires] = useState([]);
  const [medecinId, setMedecinId] = useState(null);
  const [rendezvous, setRendezvous] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);

  useEffect(() => {
    loadPlanningData();
  }, []);

  const loadPlanningData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les données de planning
      const response = await api.get("/medecin/planning");
      const horairesData = response.data.horaires || [];
      const rendezvousData = response.data.rendez_vous || [];

      setHoraires(horairesData);
      setRendezvous(rendezvousData);

      // Extraire le medecin_id des horaires
      const medecinIdFromHoraires = horairesData[0]?.medecin_id || user?.id;
      setMedecinId(medecinIdFromHoraires);
    } catch (err) {
      console.error("Erreur lors du chargement du planning:", err);
      setError("Impossible de charger le planning");
    } finally {
      setLoading(false);
    }
  };

  const calculateCreneaux = (horaires, rendezvous, targetDate) => {
    const today = new Date(targetDate);
    const dayName = getDayName(today.getDay());
    const dateKey = formatDateKey(today);
    const slotDurationMinutes = 30;

    // Trouver les horaires pour aujourd'hui
    const todayHoraires = horaires.filter(
      (h) => h.jour.toLowerCase() === dayName.toLowerCase() && h.actif === true
    );

    if (todayHoraires.length === 0) {
      return [];
    }

    // Créneaux occupés par les RDV d'aujourd'hui
    const occupiedSlots = rendezvous
      .filter(
        (rdv) =>
          (rdv.statut === "en_attente" || rdv.statut === "confirmé") &&
          rdv.date_debut.slice(0, 10) === dateKey
      )
      .map((rdv) => ({
        start: new Date(rdv.date_debut),
        end: new Date(rdv.date_fin),
      }));

    const disponibles = [];
    const now = new Date();

    todayHoraires.forEach((h) => {
      const [heureDebut, minuteDebut] = h.heure_debut.split(":").map(Number);
      const [heureFin, minuteFin] = h.heure_fin.split(":").map(Number);

      let slotStart = new Date(today);
      slotStart.setHours(heureDebut, minuteDebut, 0, 0);

      const slotEnd = new Date(today);
      slotEnd.setHours(heureFin, minuteFin, 0, 0);

      while (slotStart < slotEnd) {
        const slotEndTime = new Date(slotStart);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDurationMinutes);

        if (slotEndTime <= slotEnd) {
          // Vérifier s'il y a conflit avec RDV existant
          const hasConflict = occupiedSlots.some(
            (slot) =>
              (slotStart >= slot.start && slotStart < slot.end) ||
              (slotEndTime > slot.start && slotEndTime <= slot.end) ||
              (slotStart <= slot.start && slotEndTime >= slot.end)
          );

          // Ne pas afficher si dans le passé
          const isInPast = slotEndTime <= now;

          if (!hasConflict && !isInPast) {
            disponibles.push({
              start: new Date(slotStart),
              end: new Date(slotEndTime),
            });
          }
        }

        slotStart = slotEndTime;
      }
    });

    return disponibles;
  };

  const creneaux = useMemo(
    () => calculateCreneaux(horaires, rendezvous, selectedDate),
    [horaires, rendezvous, selectedDate]
  );

  const shiftDay = (days) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCreneauClick = (creneau) => {
    setSelectedCreneau(creneau);
    setShowReservationModal(true);
  };

  const handleReservationSuccess = () => {
    setShowReservationModal(false);
    setSelectedCreneau(null);
    loadPlanningData();
    onSuccess?.();
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>
              <h2>Nouveau Rendez-vous</h2>
              <p className={styles.modalSubtitle}>Sélectionnez un créneau disponible</p>
            </div>
            <button onClick={onClose} className={styles.closeButton}>
              <X size={24} />
            </button>
          </div>

          <div className={styles.dateInfo}>
            <button type="button" onClick={() => shiftDay(-1)} aria-label="Jour précédent">
              <ChevronLeft size={20} />
            </button>
            <Calendar size={20} />
            <span>{formatFullDate(selectedDate)}</span>
            <button type="button" onClick={() => shiftDay(1)} aria-label="Jour suivant">
              <ChevronRight size={20} />
            </button>
            <input
              type="date"
              value={formatDateKey(selectedDate)}
              onChange={(e) => e.target.value && setSelectedDate(parseDateKey(e.target.value))}
              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>

          <div className={styles.conteneurCreneaux}>
            {loading ? (
              <div className={styles.loadingMessage}>Chargement des créneaux...</div>
            ) : error ? (
              <div className={styles.errorMessage}>
                <AlertCircle size={20} />
                {error}
              </div>
            ) : creneaux.length > 0 ? (
              <div className={styles.creneauxGrid}>
                {creneaux.map((creneau, index) => (
                  <button
                    key={index}
                    className={styles.creneauCard}
                    onClick={() => handleCreneauClick(creneau)}
                  >
                    <Clock size={18} />
                    <div className={styles.creneauTime}>
                      <strong>{formatTime(creneau.start)}</strong>
                      <span>-</span>
                      <strong>{formatTime(creneau.end)}</strong>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.noCreneaux}>
                <AlertCircle size={24} />
                <p>Aucun créneau disponible pour cette date</p>
              </div>
            )}
          </div>

          <div className={styles.modalActions}>
            <button onClick={onClose} className={styles.cancelButton}>
              Fermer
            </button>
          </div>
        </div>
      </div>

      {showReservationModal && selectedCreneau && (
        <ModalReservationCreneau
          medecin={{
            medecin_id: medecinId,
            name: user?.name,
          }}
          creneau={selectedCreneau}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedCreneau(null);
          }}
          onSuccess={handleReservationSuccess}
        />
      )}
    </>
  );
};

export default ModalNouveauRendezVous;
