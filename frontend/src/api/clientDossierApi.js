import api from "./axios";

export const clientDossierApi = {
  listConsultations: () => api.get("/client/consultations").then((res) => res.data.consultations),

  listDocuments: () => api.get("/client/documents").then((res) => res.data.documents),

  marquerDocumentsVus: () => api.post("/client/documents/marquer-vus"),

  downloadDocument: (id) =>
    api.get(`/client/documents/${id}/download`, { responseType: "blob" }).then((res) => res.data),

  getDocumentsNonVus: () =>
    api.get("/client/dashboard/stats").then((res) => res.data.documents_non_vus),
};
