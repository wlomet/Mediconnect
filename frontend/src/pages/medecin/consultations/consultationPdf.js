import { formatMontant } from "./consultationFormat";

const VALEURS_LIGNE = {
  designation: (ligne) => ligne.libelle,
  quantite: (ligne) => String(Number(ligne.quantite)),
  prix: (ligne) => formatMontant(ligne.prix_unitaire),
  total: (ligne) => formatMontant(ligne.total),
};

// Remplit les champs d'un modèle avec les données enregistrées de la consultation.
export const valeursConsultation = (layout, { texte, lignes = [] }) => {
  const valeurs = {};

  for (const element of layout.elements ?? []) {
    if (element.type === "saisie" && element.key === "prescription") {
      valeurs[element.key] = texte ?? "";
    }

    if (element.type === "tableau" && element.key === "lignes") {
      valeurs[element.key] = lignes.map((ligne) =>
        Object.fromEntries(
          (element.columns ?? []).map((col) => [col.key, VALEURS_LIGNE[col.key]?.(ligne) ?? ""])
        )
      );
    }
  }

  return valeurs;
};
