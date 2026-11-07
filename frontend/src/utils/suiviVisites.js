import { statistiquesApi } from "../api/statistiquesApi";

const CLE_VISITEUR = "mediconnect_visiteur_id";

const genererIdentifiant = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

// Identifiant anonyme conservé dans le navigateur, pour compter les visiteurs uniques par jour.
const obtenirVisiteurId = () => {
  let id = localStorage.getItem(CLE_VISITEUR);
  if (!id) {
    id = genererIdentifiant();
    localStorage.setItem(CLE_VISITEUR, id);
  }
  return id;
};

export const enregistrerVisite = () => {
  statistiquesApi.enregistrerVisite(obtenirVisiteurId()).catch(() => {});
};
