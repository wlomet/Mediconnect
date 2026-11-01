import api from "./axios";

const root = "/super-admin";

/**
 * Endpoints superadmin : référentiels, rendez-vous, établissements et médecins.
 */
export const superAdminApi = {
  listAntecedents: () => api.get(`${root}/antecedent-options`).then((res) => res.data),
  createAntecedent: (payload) => api.post(`${root}/antecedent-options`, payload).then((res) => res.data.option),
  updateAntecedent: (id, payload) =>
    api.put(`${root}/antecedent-options/${id}`, payload).then((res) => res.data.option),
  deleteAntecedent: (id) => api.delete(`${root}/antecedent-options/${id}`),

  listSpecialites: () => api.get(`${root}/specialites`).then((res) => res.data.specialites),
  createSpecialite: (payload) => api.post(`${root}/specialites`, payload).then((res) => res.data.specialite),
  updateSpecialite: (id, payload) => api.put(`${root}/specialites/${id}`, payload).then((res) => res.data.specialite),
  deleteSpecialite: (id) => api.delete(`${root}/specialites/${id}`),

  listRendezVous: (params) => api.get(`${root}/rendez-vous`, { params }).then((res) => res.data),
  // Réponse complète : telechargerCsv attend { data, headers }
  exportRendezVous: (params) => api.get(`${root}/rendez-vous/export`, { params, responseType: "blob" }),

  listActeurs: () => api.get(`${root}/acteurs`).then((res) => res.data),

  listPdfTemplates: (params) => api.get(`${root}/pdf-templates`, { params }).then((res) => res.data.templates),
  createPdfTemplateFromDefault: (payload) =>
    api.post(`${root}/pdf-templates/from-default`, payload).then((res) => res.data.template),
  deletePdfTemplate: (id) => api.delete(`${root}/pdf-templates/${id}`),
};

/**
 * API modèles et logos du superadmin, limitée à un modèle ou à un propriétaire.
 * @param {{template_id?: number, owner_type?: string, owner_id?: number|string}} scope
 */
export const superAdminPdfApi = (scope = {}) => ({
  listImages: (type) =>
    api
      .get(`${root}/pdf-images`, { params: { ...scope, ...(type ? { type } : {}) } })
      .then((res) => res.data.images),

  uploadImage: (file, type) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", type);
    Object.entries(scope).forEach(([key, value]) => formData.append(key, value));
    return api.post(`${root}/pdf-images`, formData).then((res) => res.data.image);
  },

  deleteImage: (id) => api.delete(`${root}/pdf-images/${id}`),

  fetchImageBytes: (id) =>
    api
      .get(`${root}/pdf-images/${id}/file`, { responseType: "arraybuffer" })
      .then((res) => ({ bytes: res.data, mime: res.headers["content-type"] })),

  getTemplate: (id) => api.get(`${root}/pdf-templates/${id}`).then((res) => res.data.template),

  updateTemplate: (id, payload) => api.put(`${root}/pdf-templates/${id}`, payload).then((res) => res.data.template),
});
