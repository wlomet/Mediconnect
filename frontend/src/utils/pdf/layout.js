export const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
};

export const ELEMENT_TYPES = {
  texte: "Texte libre",
  variable: "Donnée automatique",
  signature: "Signature du médecin",
  saisie: "Champ à saisir",
  tableau: "Tableau (lignes saisies)",
  image: "Logo / image",
};

export const VARIABLES = [
  { path: "medecin.nom", label: "Médecin - nom" },
  { path: "medecin.specialite", label: "Médecin - spécialité" },
  { path: "medecin.hopital", label: "Médecin - établissement" },
  { path: "medecin.adresse", label: "Médecin - adresse" },
  { path: "medecin.ville", label: "Médecin - ville" },
  { path: "medecin.telephone", label: "Médecin - téléphone" },
  { path: "patient.nom", label: "Patient - nom" },
  { path: "patient.email", label: "Patient - email" },
  { path: "patient.telephone", label: "Patient - téléphone" },
  { path: "rendez_vous.date", label: "Rendez-vous - date" },
  { path: "rendez_vous.heure", label: "Rendez-vous - heure" },
  { path: "rendez_vous.motif", label: "Rendez-vous - motif" },
  { path: "date_jour", label: "Date du jour" },
];

export const slugify = (text = "") =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Coordonnées en points, origine en haut à gauche (A4 = 595 x 842)
export const createElement = (type, id) => {
  const base = {
    id,
    type,
    x: 40,
    y: 40,
    width: 250,
    height: 30,
    fontSize: 12,
    bold: false,
    color: "#000000",
    align: "left",
  };

  switch (type) {
    case "texte":
      return { ...base, text: "Texte" };
    case "variable":
      return { ...base, source: "patient.nom" };
    case "signature":
      return { ...base, width: 260, height: 50, fontSize: 20, align: "right", source: "medecin.nom" };
    case "saisie":
      return { ...base, key: "saisie", label: "Champ" };
    case "tableau":
      return {
        ...base,
        width: 515,
        height: 150,
        key: "lignes",
        label: "Lignes",
        columns: [
          { key: "designation", label: "Désignation" },
          { key: "quantite", label: "Quantité" },
          { key: "prix", label: "Prix" },
        ],
      };
    case "image":
      return { ...base, width: 150, height: 80, pdf_image_id: null };
    default:
      return base;
  }
};

export const createBlankLayout = () => ({ format: "A4", elements: [] });

// Complète les éléments d'un modèle enregistré avec des champs manquants (valeurs par défaut)
export const normalizeElement = (element, index) => {
  const id = element.id ?? `el-legacy-${index}`;
  return { ...createElement(element.type, id), ...element, id };
};

export const normalizeLayout = (layout) => ({
  format: layout?.format ?? "A4",
  elements: (layout?.elements ?? []).map(normalizeElement),
});
