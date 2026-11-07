export const STATUT_LABELS = {
  en_cours: "En cours",
  en_attente: "En attente",
  abandonnee: "Abandonnée",
  terminee: "Terminée",
};

// Valeurs identiques à ConsultationOrdonnanceLigne::PRISES côté backend.
export const PRISE_OPTIONS = [
  { valeur: "1_fois_par_jour", libelle: "1 fois par jour" },
  { valeur: "2_fois_par_jour", libelle: "2 fois par jour" },
  { valeur: "3_fois_par_jour", libelle: "3 fois par jour" },
  { valeur: "4_fois_par_jour", libelle: "4 fois par jour" },
  { valeur: "matin", libelle: "Le matin" },
  { valeur: "midi", libelle: "Le midi" },
  { valeur: "soir", libelle: "Le soir" },
  { valeur: "matin_et_soir", libelle: "Matin et soir" },
  { valeur: "au_coucher", libelle: "Au coucher" },
  { valeur: "si_besoin", libelle: "Si besoin" },
];

export const JOURNAL_LABELS = {
  demarree: "Consultation démarrée",
  heure_debut_modifiee: "Heure de début modifiée",
  ordonnance_enregistree: "Ordonnance enregistrée",
  facture_enregistree: "Facture enregistrée",
  abandonnee: "Consultation abandonnée",
  mise_en_attente: "Consultation mise en attente",
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
