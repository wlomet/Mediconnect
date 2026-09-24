import { useState, useEffect, useRef, useCallback, useContext } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import ModalHorairesHebdo from "./modals/ModalHorairesHebdo";
import ModalIndisponibilite from "./modals/ModalIndisponibilite";
import ModalReservationCreneau from "./modals/ModalReservationCreneau";
import ModalUpdateRendezVous from "./modals/ModalUpdateRendezVous";
import NavbarMedecin from "../components/NavbarMedecin";
import styles from "./PlanningMedecin.module.css";
import api from "../../../api/axios";
import { AuthContext } from "../../../context/AuthContext";

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => new Date(`${dateKey}T00:00:00`);

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const addMinutes = (date, minutes) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
};

const parseDateTime = (dateKey, time) => new Date(`${dateKey}T${time}`);

const convertJourToNumber = (jour) => {
  const jours = {
    dimanche: 0,
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
  };
  return jours[jour.toLowerCase()] ?? 0;
};

const buildEvents = (horaires, indisponibilitesRaw, range, rendezvousRaw = []) => {
  if (!range) {
    return [];
  }

  const rendezvousEvents = rendezvousRaw
    .filter((rdv) => rdv.statut !== "annulé")
    .map((rdv) => {
      const backgroundColor = rdv.statut === "confirmé" ? "#10b981" : "#f59e0b";
      const borderColor = rdv.statut === "confirmé" ? "#059669" : "#d97706";
      return {
        id: `rdv-${rdv.id}`,
        title: rdv.patient?.name || "RDV",
        start: new Date(rdv.date_debut),
        end: new Date(rdv.date_fin),
        backgroundColor,
        borderColor,
        textColor: "white",
        extendedProps: {
          type: "rendezvous",
          statut: rdv.statut,
          rdvData: rdv,
        },
      };
    });

  // Créer un ensemble des créneaux occupés par des RDV (en attente ou confirmé)
  const occupiedSlots = rendezvousRaw
    .filter((rdv) => rdv.statut === "en_attente" || rdv.statut === "confirmé")
    .map((rdv) => ({
      start: new Date(rdv.date_debut),
      end: new Date(rdv.date_fin),
    }));

  const indisponibilites = indisponibilitesRaw.map((i) => {
    const startKey = i.date_debut.slice(0, 10);
    const endKey = i.date_fin.slice(0, 10);
    const endExclusive = addDays(parseDateKey(endKey), 1);

    return {
      title: i.motif || "Indisponible",
      start: startKey,
      end: formatDateKey(endExclusive),
      allDay: true,
      display: "background",
      backgroundColor: "#ef4444",
      borderColor: "#ef4444",
    };
  });

  const blockedDates = new Set();

  indisponibilitesRaw.forEach((i) => {
    const startKey = i.date_debut.slice(0, 10);
    const endKey = i.date_fin.slice(0, 10);
    let cursor = parseDateKey(startKey);
    const last = parseDateKey(endKey);

    while (cursor <= last) {
      blockedDates.add(formatDateKey(cursor));
      cursor = addDays(cursor, 1);
    }
  });

  const horairesActifs = horaires.filter((h) => h.actif === true);
  const horairesByDay = horairesActifs.reduce((acc, h) => {
    const dayNumber = convertJourToNumber(h.jour);
    if (!acc[dayNumber]) {
      acc[dayNumber] = [];
    }
    acc[dayNumber].push(h);
    return acc;
  }, {});

  const disponibilites = [];
  const creneauxDisponibles = [];
  let cursor = new Date(range.start);
  const rangeEnd = new Date(range.end);
  const slotDurationMinutes = 30;
  const now = new Date();

  // Calculer la date limite (2 mois après aujourd'hui)
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

  while (cursor < rangeEnd) {
    const dateKey = formatDateKey(cursor);
    const dayHoraires = horairesByDay[cursor.getDay()] || [];

    if (!blockedDates.has(dateKey)) {
      dayHoraires.forEach((h) => {
        disponibilites.push({
          title: "Disponible",
          start: `${dateKey}T${h.heure_debut}`,
          end: `${dateKey}T${h.heure_fin}`,
          display: "background",
          backgroundColor: "darkblue",
          borderColor: "#3c57a2",
        });

        let currentSlotStart = parseDateTime(dateKey, h.heure_debut);
        const dayEnd = parseDateTime(dateKey, h.heure_fin);

        while (currentSlotStart < dayEnd) {
          const currentSlotEnd = addMinutes(currentSlotStart, slotDurationMinutes);

          if (currentSlotEnd <= dayEnd) {
            // Vérifier si ce créneau chevauche un RDV existant
            const hasConflict = occupiedSlots.some(
              (slot) =>
                (currentSlotStart >= slot.start && currentSlotStart < slot.end) ||
                (currentSlotEnd > slot.start && currentSlotEnd <= slot.end) ||
                (currentSlotStart <= slot.start && currentSlotEnd >= slot.end)
            );

            // Ne pas afficher le créneau s'il est dans le passé ou après 2 mois
            const isInPast = currentSlotEnd <= now;
            const isAfterTwoMonths = currentSlotStart >= twoMonthsFromNow;

            if (!hasConflict && !isInPast && !isAfterTwoMonths) {
              creneauxDisponibles.push({
                title: "Créneau",
                start: new Date(currentSlotStart),
                end: new Date(currentSlotEnd),
                classNames: ["creneau-disponible"],
                backgroundColor: "transparent",
                borderColor: "#10b981",
                textColor: "#10b981",
                extendedProps: {
                  type: "creneau",
                  statut: "disponible",
                },
              });
            }
          }

          currentSlotStart = currentSlotEnd;
        }
      });
    }

    cursor = addDays(cursor, 1);
  }

  return [...disponibilites, ...indisponibilites, ...creneauxDisponibles, ...rendezvousEvents];
};

export default function PlanningMedecin() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const horairesRef = useRef([]);
  const indisposRef = useRef([]);
  const rendezvousRef = useRef([]);
  const currentRangeRef = useRef(null);
  const [showHoraireModal, setShowHoraireModal] = useState(false);
  const [showIndispoModal, setShowIndispoModal] = useState(false);
  const [showRendezVousModal, setShowRendezVousModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [selectedRendezVous, setSelectedRendezVous] = useState(null);
  const currentMedecinId = horairesRef.current[0]?.medecin_id ?? user?.id;

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get("/medecin/planning");
      console.log("Réponse brute du planning :", res.data);
      const nextHoraires = res.data.horaires || [];
      const nextIndispos = res.data.indisponibilites || [];
      const nextRendezvous = res.data.rendez_vous || [];

      horairesRef.current = nextHoraires;
      indisposRef.current = nextIndispos;
      rendezvousRef.current = nextRendezvous;

      if (currentRangeRef.current) {
        const newEvents = buildEvents(
          nextHoraires,
          nextIndispos,
          currentRangeRef.current,
          nextRendezvous
        );
        console.log("Événements recalculés :", newEvents);
        setEvents(newEvents);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du planning :", err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className={styles.container}>
      <NavbarMedecin />
      <div className="p-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2 md:gap-0">
          <h2 className="text-xl font-semibold">Mon planning</h2>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowHoraireModal(true)}
              className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 w-full md:w-auto"
            >
              Gestion des Horaires Hebdos
            </button>
            <button
              onClick={() => setShowIndispoModal(true)}
              className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 w-full md:w-auto"
            >
              Ajouter indisponibilité
            </button>
            <button
              onClick={fetchEvents}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 w-full md:w-auto"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <div className="p-4">
          <FullCalendar
            plugins={[timeGridPlugin]}
            initialView="timeGridDay"
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            height="auto"
            events={events}
            locale="fr"
            firstDay={1}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridDay,timeGridWeek",
            }}
            eventTextColor="#000"
            eventClick={(clickInfo) => {
              const { event } = clickInfo;
              if (event.extendedProps?.type === "creneau") {
                setSelectedCreneau({
                  start: event.start,
                  end: event.end,
                });
                setShowRendezVousModal(true);
              } else if (event.extendedProps?.type === "rendezvous") {
                setSelectedRendezVous(event.extendedProps.rdvData);
                setShowUpdateModal(true);
              }
            }}
            eventContent={(eventInfo) => {
              const type = eventInfo.event.extendedProps?.type;
              if (type === "creneau") {
                return { html: '<div class="event-creneau">✓</div>' };
              }
              return undefined;
            }}
            datesSet={(arg) => {
              const range = { start: arg.start, end: arg.end };
              currentRangeRef.current = range;
              setEvents(
                buildEvents(horairesRef.current, indisposRef.current, range, rendezvousRef.current)
              );
            }}
          />
        </div>

        {showHoraireModal && (
          <ModalHorairesHebdo onClose={() => setShowHoraireModal(false)} onUpdate={fetchEvents} />
        )}
        {showIndispoModal && (
          <ModalIndisponibilite onClose={() => setShowIndispoModal(false)} onUpdate={fetchEvents} />
        )}
        {showRendezVousModal && selectedCreneau && (
          <ModalReservationCreneau
            medecin={{
              medecin_id: currentMedecinId,
              name: user?.name,
            }}
            creneau={selectedCreneau}
            onClose={() => setShowRendezVousModal(false)}
            onSuccess={() => {
              setShowRendezVousModal(false);
              fetchEvents();
            }}
          />
        )}
        {showUpdateModal && selectedRendezVous && (
          <ModalUpdateRendezVous
            rendezVous={selectedRendezVous}
            onClose={() => setShowUpdateModal(false)}
            onSuccess={() => {
              setShowUpdateModal(false);
              fetchEvents();
            }}
          />
        )}
      </div>
    </div>
  );
}
