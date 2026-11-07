import api from "./axios";
import { telechargerCsv } from "../utils/csvExport";
import { telechargerTableau } from "../utils/exportTableau";

const base = "/medecin/consultations";

export const consultationApi = {
  list: (statut) =>
    api.get(base, { params: statut ? { statut } : {} }).then((res) => res.data.consultations),

  exporter: (format, statut) => {
    const params = statut ? { statut } : {};

    if (format === "csv") {
      return api.get(`${base}/export`, { params, responseType: "blob" }).then(telechargerCsv);
    }

    return api
      .get(`${base}/export`, { params: { ...params, format: "json" } })
      .then((res) =>
        telechargerTableau({
          format,
          nomBase: res.data.nom_base,
          titre: "Consultations",
          entetes: res.data.entetes,
          lignes: res.data.lignes,
        })
      );
  },

  enCours: () => api.get(`${base}/en-cours`).then((res) => res.data.consultation),

  rendezVousDisponibles: (search = "") =>
    api.get(`${base}/rendez-vous-disponibles`, { params: { search } }).then((res) => res.data.rendez_vous),

  demarrer: (payload) => api.post(base, payload).then((res) => res.data.consultation),

  show: (id) => api.get(`${base}/${id}`).then((res) => res.data),

  updateHeureDebut: (id, heureDebutReelle) =>
    api
      .put(`${base}/${id}/heure-debut`, { heure_debut_reelle: heureDebutReelle })
      .then((res) => res.data.consultation),

  saveOrdonnance: (id, { lignes, commentaire }) =>
    api.put(`${base}/${id}/ordonnance`, { lignes, commentaire }).then((res) => res.data.consultation),

  saveFacture: (id, lignes) =>
    api.put(`${base}/${id}/facture`, { lignes }).then((res) => res.data.consultation),

  abandonner: (id, motif) =>
    api.post(`${base}/${id}/abandon`, { motif }).then((res) => res.data.consultation),

  mettreEnAttente: (id) => api.post(`${base}/${id}/mettre-en-attente`).then((res) => res.data.consultation),

  reprendre: (id) => api.post(`${base}/${id}/reprendre`).then((res) => res.data.consultation),

  terminer: (id) => api.post(`${base}/${id}/terminer`).then((res) => res.data.consultation),
};

// Une consultation en conflit (409) est renvoyée dans consultationId, avec son code (ex. consultation_en_cours).
export const extraireErreur = (error, fallback = "Une erreur est survenue") => {
  const premiereErreurValidation = Object.values(error.response?.data?.errors ?? {})[0]?.[0];

  return {
    message: premiereErreurValidation || error.response?.data?.message || fallback,
    consultationId: error.response?.data?.consultation_id ?? null,
    code: error.response?.data?.code ?? null,
  };
};
