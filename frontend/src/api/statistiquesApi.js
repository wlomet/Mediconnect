import api from "./axios";

export const statistiquesApi = {
  getStatistiques: () => api.get("/statistiques").then((res) => res.data),

  enregistrerVisite: (visiteurId) => api.post("/visites", { visiteur_id: visiteurId }),
};
