import api from "./axios";

const base = "/medecin/consultations";

export const consultationApi = {
  list: (statut) =>
    api.get(base, { params: statut ? { statut } : {} }).then((res) => res.data.consultations),

  enCours: () => api.get(`${base}/en-cours`).then((res) => res.data.consultation),

  rendezVousDisponibles: (search = "") =>
    api.get(`${base}/rendez-vous-disponibles`, { params: { search } }).then((res) => res.data.rendez_vous),

  demarrer: (payload) => api.post(base, payload).then((res) => res.data.consultation),

  show: (id) => api.get(`${base}/${id}`).then((res) => res.data),

  updateHeureDebut: (id, heureDebutReelle) =>
    api
      .put(`${base}/${id}/heure-debut`, { heure_debut_reelle: heureDebutReelle })
      .then((res) => res.data.consultation),

  saveOrdonnance: (id, texte) =>
    api.put(`${base}/${id}/ordonnance`, { texte }).then((res) => res.data.consultation),

  saveFacture: (id, lignes) =>
    api.put(`${base}/${id}/facture`, { lignes }).then((res) => res.data.consultation),

  abandonner: (id, motif) =>
    api.post(`${base}/${id}/abandon`, { motif }).then((res) => res.data.consultation),

  reprendre: (id) => api.post(`${base}/${id}/reprendre`).then((res) => res.data.consultation),

  terminer: (id) => api.post(`${base}/${id}/terminer`).then((res) => res.data.consultation),
};

// Une consultation en conflit (409) est renvoyée dans consultationId.
export const extraireErreur = (error, fallback = "Une erreur est survenue") => {
  const premiereErreurValidation = Object.values(error.response?.data?.errors ?? {})[0]?.[0];

  return {
    message: premiereErreurValidation || error.response?.data?.message || fallback,
    consultationId: error.response?.data?.consultation_id ?? null,
  };
};
