// Helpers de manipulation de dates partagés par les modules planning/rendez-vous médecin

export const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey) => new Date(`${dateKey}T00:00:00`);

export const parseDateTime = (dateKey, time) => new Date(`${dateKey}T${time}`);

export const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const addMinutes = (date, minutes) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
};

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export const convertJourToNumber = (jour) => {
  const index = JOURS_SEMAINE.indexOf(jour.toLowerCase());
  return index === -1 ? 0 : index;
};

export const getDayName = (dayNumber) => JOURS_SEMAINE[dayNumber];

export const getMonday = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
};

// Bornes incluses des raccourcis de période : jour, semaine ou mois en cours
export const bornesPresetPeriode = (preset, maintenant = new Date()) => {
  if (preset === "semaine") {
    const debut = getMonday(maintenant);
    return { debut, fin: addDays(debut, 6) };
  }
  if (preset === "mois") {
    return {
      debut: new Date(maintenant.getFullYear(), maintenant.getMonth(), 1),
      fin: new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0),
    };
  }
  return { debut: maintenant, fin: maintenant };
};

export const libellePeriode = (from, to) =>
  `du ${parseDateKey(from).toLocaleDateString("fr-FR")} au ${parseDateKey(to).toLocaleDateString("fr-FR")}`;

// Les jours et heures sont interprétés dans le fuseau du navigateur (le backend stocke en UTC)
export const paramsPeriode = ({ from, to }) => ({
  from,
  to,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
