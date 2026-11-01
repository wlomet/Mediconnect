export const STATUT_LABELS = {
  en_cours: "En cours",
  abandonnee: "Abandonnée",
  terminee: "Terminée",
};

export const JOURNAL_LABELS = {
  demarree: "Consultation démarrée",
  heure_debut_modifiee: "Heure de début modifiée",
  ordonnance_enregistree: "Ordonnance enregistrée",
  facture_enregistree: "Facture enregistrée",
  abandonnee: "Consultation abandonnée",
  reprise: "Consultation reprise",
  terminee: "Consultation terminée",
};

const parseDate = (value) => (value ? new Date(String(value).replace(" ", "T")) : null);

export const formatDateHeure = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
};

export const formatMontant = (value) =>
  Number(value ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Valeur attendue par un input datetime-local, exprimée en heure locale.
export const versValeurDateLocale = (value) => {
  const date = parseDate(value);
  if (!date) return "";

  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
