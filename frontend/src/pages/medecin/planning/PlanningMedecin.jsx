import { useState, useEffect, useRef, useCallback, useContext, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import ModalHorairesHebdo from "./modals/ModalHorairesHebdo";
import ModalIndisponibilite from "./modals/ModalIndisponibilite";
import ModalReservationCreneau from "./modals/ModalReservationCreneau";
import ModalUpdateRendezVous from "./modals/ModalUpdateRendezVous";
import ModalNouveauRendezVous from "../dashboard/modals/ModalNouveauRendezVous";
import NavbarMedecin from "../components/NavbarMedecin";
import styles from "./PlanningMedecin.module.css";
import api from "../../../api/axios";
import { AuthContext } from "../../../context/AuthContext";
import {
  formatDateKey,
  parseDateKey,
  parseDateTime,
  addDays,
  addMinutes,
  convertJourToNumber,
} from "../../../utils/dateHelpers";

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

const VIEW_MODES = [
  { value: "calendar", label: "Calendrier" },
  { value: "table", label: "Tableau" },
  { value: "list", label: "Liste" },
];

const TYPE_LABELS = {
  creneau: "Créneau libre",
  rendezvous: "Rendez-vous",
  indisponibilite: "Indisponibilité",
};

const TYPE_STYLES = {
  creneau: "bg-emerald-100 text-emerald-700",
  rendezvous: "bg-amber-100 text-amber-700",
  indisponibilite: "bg-red-100 text-red-700",
};

const NAV_BUTTON_CLASS =
  "px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-[#0A1E3D] hover:bg-gray-50";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

const formatTime = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const formatDayLabel = (date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const getMonday = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
};

// Liste à plat des créneaux, RDV et indisponibilités sur la plage donnée (utilisée par le tableau et la liste)
const buildListItems = (planning, range) => {
  if (!range) {
    return [];
  }

  const inRange = (date) => date >= range.start && date < range.end;

  const calendarEvents = buildEvents(
    planning.horaires,
    planning.indisponibilites,
    range,
    planning.rendezVous
  );

  const creneaux = calendarEvents
    .filter((e) => e.extendedProps?.type === "creneau")
    .map((e) => ({ type: "creneau", start: e.start, end: e.end, detail: "Disponible" }));

  const rendezVous = calendarEvents
    .filter((e) => e.extendedProps?.type === "rendezvous" && inRange(e.start))
    .map((e) => ({
      type: "rendezvous",
      start: e.start,
      end: e.end,
      detail: `${e.title} (${(e.extendedProps.statut || "").replace("_", " ")})`,
      rdv: e.extendedProps.rdvData,
    }));

  const indisponibilites = planning.indisponibilites.flatMap((i) => {
    const days = [];
    let cursor = parseDateKey(i.date_debut.slice(0, 10));
    const last = parseDateKey(i.date_fin.slice(0, 10));
    while (cursor <= last) {
      if (inRange(cursor)) {
        days.push({
          type: "indisponibilite",
          start: cursor,
          end: cursor,
          detail: i.motif || "Indisponible",
        });
      }
      cursor = addDays(cursor, 1);
    }
    return days;
  });

  return [...creneaux, ...rendezVous, ...indisponibilites]
    .sort((a, b) => a.start - b.start)
    .map((item, index) => ({ ...item, key: `${item.type}-${index}` }));
};

const toCsvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const buildRdvCsv = (rdvs) => {
  const header = ["Date", "Heure début", "Heure fin", "Patient", "Email", "Statut"];
  const rows = rdvs.map((rdv) => {
    const start = new Date(rdv.date_debut);
    const end = new Date(rdv.date_fin);
    return [
      start.toLocaleDateString("fr-FR"),
      formatTime(start),
      formatTime(end),
      rdv.client?.name,
      rdv.client?.email,
      rdv.statut,
    ];
  });
  return [header, ...rows].map((row) => row.map(toCsvCell).join(";")).join("\r\n");
};

const downloadCsv = (content, filename) => {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function PlanningMedecin() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [planning, setPlanning] = useState({ horaires: [], indisponibilites: [], rendezVous: [] });
  const [viewMode, setViewMode] = useState("calendar");
  const [listStart, setListStart] = useState(() => getMonday(new Date()));
  const [currentView, setCurrentView] = useState(() =>
    window.innerWidth >= 768 ? "timeGridWeek" : "timeGridDay"
  );
  const calendarRef = useRef(null);
  const horairesRef = useRef([]);
  const indisposRef = useRef([]);
  const rendezvousRef = useRef([]);
  const currentRangeRef = useRef(null);
  const [showHoraireModal, setShowHoraireModal] = useState(false);
  const [showIndispoModal, setShowIndispoModal] = useState(false);
  const [showRendezVousModal, setShowRendezVousModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showNewRdvModal, setShowNewRdvModal] = useState(false);
  const [selectedCreneau, setSelectedCreneau] = useState(null);
  const [selectedRendezVous, setSelectedRendezVous] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [exportPeriod, setExportPeriod] = useState("week");
  const [exportFrom, setExportFrom] = useState(() => formatDateKey(new Date()));
  const [exportTo, setExportTo] = useState(() => formatDateKey(new Date()));

  const handleExport = () => {
    let start;
    let end;
    if (exportPeriod === "week") {
      start = getMonday(listStart);
      end = addDays(start, 7);
    } else if (exportPeriod === "month") {
      start = new Date(listStart.getFullYear(), listStart.getMonth(), 1);
      end = new Date(listStart.getFullYear(), listStart.getMonth() + 1, 1);
    } else {
      start = parseDateKey(exportFrom);
      end = addDays(parseDateKey(exportTo), 1);
    }

    const rdvs = planning.rendezVous
      .filter((rdv) => {
        const date = new Date(rdv.date_debut);
        return date >= start && date < end;
      })
      .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut));

    const suffix = `${formatDateKey(start)}_${formatDateKey(addDays(end, -1))}`;
    downloadCsv(buildRdvCsv(rdvs), `rendez-vous_${suffix}.csv`);
  };

  const exportInvalid =
    exportPeriod === "custom" && (!exportFrom || !exportTo || exportFrom > exportTo);
  const currentMedecinId = horairesRef.current[0]?.medecin_id ?? user?.id;

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get("/medecin/planning");
      const nextHoraires = res.data.horaires || [];
      const nextIndispos = res.data.indisponibilites || [];
      const nextRendezvous = res.data.rendez_vous || [];

      horairesRef.current = nextHoraires;
      indisposRef.current = nextIndispos;
      rendezvousRef.current = nextRendezvous;
      setPlanning({
        horaires: nextHoraires,
        indisponibilites: nextIndispos,
        rendezVous: nextRendezvous,
      });

      if (currentRangeRef.current) {
        const newEvents = buildEvents(
          nextHoraires,
          nextIndispos,
          currentRangeRef.current,
          nextRendezvous
        );
        setEvents(newEvents);
      }
    } catch (err) {
      console.error("Erreur lors du chargement du planning :", err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Gérer le changement de vue en fonction de la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      const newView = window.innerWidth >= 768 ? "timeGridWeek" : "timeGridDay";
      if (newView !== currentView) {
        setCurrentView(newView);
        // Changer la vue du calendrier si la ref est disponible
        if (calendarRef.current) {
          calendarRef.current.getApi().changeView(newView);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentView]);

  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const openItemRef = useRef(null);

  const listRange = useMemo(() => ({ start: listStart, end: addDays(listStart, 7) }), [listStart]);
  const listDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(listStart, i)), [listStart]);
  const listItems = useMemo(() => buildListItems(planning, listRange), [planning, listRange]);

  const itemsByDay = useMemo(
    () =>
      listItems
        .filter((item) => item.type !== "creneau")
        .reduce((acc, item) => {
        const key = formatDateKey(item.start);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {}),
    [listItems]
  );

  const tableRows = useMemo(
    () =>
      listItems
        .filter((item) => item.type !== "creneau")
        .map((item) => ({
        date: item.start.toLocaleDateString("fr-FR"),
        jour: item.start.toLocaleDateString("fr-FR", { weekday: "long" }),
        debut: item.type === "indisponibilite" ? "Journée" : formatTime(item.start),
        fin: item.type === "indisponibilite" ? "" : formatTime(item.end),
        type: TYPE_LABELS[item.type],
        detail: escapeHtml(item.detail),
        item,
      })),
    [listItems]
  );

  const periodLabel = `Du ${listStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })} au ${addDays(listStart, 6).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;

  const openItem = (item) => {
    if (item.type === "creneau") {
      setSelectedCreneau({ start: item.start, end: item.end });
      setShowRendezVousModal(true);
    } else if (item.type === "rendezvous") {
      setSelectedRendezVous(item.rdv);
      setShowUpdateModal(true);
    }
  };
  openItemRef.current = openItem;

  // DataTables est initialisé une seule fois, les lignes sont ensuite mises à jour
  useEffect(() => {
    if (!tableRef.current || !window.$) return undefined;

    const $table = window.$(tableRef.current);
    const dt = $table.DataTable({
      data: [],
      columns: [
        { data: "date" },
        { data: "jour" },
        { data: "debut" },
        { data: "fin" },
        { data: "type" },
        { data: "detail" },
      ],
      order: [],
      pageLength: 25,
      autoWidth: false,
    });
    dataTableRef.current = dt;

    const handleRowClick = function () {
      const row = dt.row(this).data();
      if (row?.item) {
        openItemRef.current?.(row.item);
      }
    };
    $table.on("click", "tbody tr", handleRowClick);

    return () => {
      $table.off("click", "tbody tr", handleRowClick);
      dt.destroy();
      dataTableRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dt = dataTableRef.current;
    if (!dt) return;
    dt.clear().rows.add(tableRows).draw();
  }, [tableRows]);

  // Recalcule la taille des composants masqués lors du changement de vue
  useEffect(() => {
    if (viewMode === "calendar") {
      calendarRef.current?.getApi().updateSize();
    } else if (viewMode === "table") {
      dataTableRef.current?.columns.adjust().draw(false);
    }
  }, [viewMode]);

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
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setViewMode(mode.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      viewMode === mode.value
                        ? "bg-[#0596DE] text-white"
                        : "text-[#0A1E3D] hover:bg-gray-100"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowExport((v) => !v)}
                className="ml-auto px-3 py-1.5 rounded-lg bg-[#0596DE] text-white text-sm font-medium hover:opacity-90"
              >
                Exporter CSV
              </button>
            </div>
            {showExport && (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
                  Période
                  <select
                    value={exportPeriod}
                    onChange={(e) => setExportPeriod(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="week">Semaine affichée</option>
                    <option value="month">Mois de la semaine affichée</option>
                    <option value="custom">Entre deux dates</option>
                  </select>
                </label>
                {exportPeriod === "custom" && (
                  <>
                    <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
                      Du
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
                      Au
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportInvalid}
                  className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  Télécharger
                </button>
              </div>
            )}
            {viewMode !== "calendar" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRdvModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
                >
                  Nouveau Rendez-vous
                </button>
                <button
                  type="button"
                  onClick={() => setListStart((d) => addDays(d, -7))}
                  className={NAV_BUTTON_CLASS}
                >
                  ‹ Précédente
                </button>
                <button
                  type="button"
                  onClick={() => setListStart(getMonday(new Date()))}
                  className={NAV_BUTTON_CLASS}
                >
                  Cette semaine
                </button>
                <button
                  type="button"
                  onClick={() => setListStart((d) => addDays(d, 7))}
                  className={NAV_BUTTON_CLASS}
                >
                  Suivante ›
                </button>
              </div>
            )}
          </div>

          <div style={{ display: viewMode === "calendar" ? "block" : "none" }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin]}
            initialView={currentView}
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

          <div
            className="bg-white rounded-xl shadow-sm p-4"
            style={{ display: viewMode === "table" ? "block" : "none" }}
          >
            <table ref={tableRef} className="display stripe hover w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Jour</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Type</th>
                  <th>Détail</th>
                </tr>
              </thead>
              <tbody />
            </table>
          </div>

          {viewMode === "list" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{periodLabel}</p>
              {listDays.map((day) => {
                const dayKey = formatDateKey(day);
                const dayItems = itemsByDay[dayKey] || [];
                return (
                  <section key={dayKey} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <h3 className="px-4 py-2 bg-[#f8f9fb] border-b border-gray-200 font-semibold text-[#0A1E3D] capitalize">
                      {formatDayLabel(day)}
                    </h3>
                    {dayItems.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400">Aucun créneau</p>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {dayItems.map((item) => (
                          <li key={item.key}>
                            <button
                              type="button"
                              onClick={() => openItem(item)}
                              disabled={item.type === "indisponibilite"}
                              className="w-full flex flex-wrap items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 disabled:hover:bg-white disabled:cursor-default"
                            >
                              <span className="w-32 font-medium text-[#0A1E3D]">
                                {item.type === "indisponibilite"
                                  ? "Journée"
                                  : `${formatTime(item.start)} - ${formatTime(item.end)}`}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_STYLES[item.type]}`}>
                                {TYPE_LABELS[item.type]}
                              </span>
                              <span className="text-sm text-gray-600">{item.detail}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {showNewRdvModal && (
          <ModalNouveauRendezVous
            onClose={() => setShowNewRdvModal(false)}
            onSuccess={fetchEvents}
          />
        )}

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
