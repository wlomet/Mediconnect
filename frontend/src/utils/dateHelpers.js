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
