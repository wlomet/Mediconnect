import api from "./axios";

const base = "/medecin";

/**
 * Endpoints logos et modèles, partagés entre médecin et directeur.
 * @param {string} root préfixe de rôle ("/medecin" ou "/directeur")
 */
const templateApi = (root) => ({
  listImages: (type) =>
    api.get(`${root}/pdf-images`, { params: type ? { type } : {} }).then((res) => res.data.images),

  uploadImage: (file, type) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", type);
    return api.post(`${root}/pdf-images`, formData).then((res) => res.data.image);
  },

  deleteImage: (id) => api.delete(`${root}/pdf-images/${id}`),

  fetchImageBytes: (id) =>
    api
      .get(`${root}/pdf-images/${id}/file`, { responseType: "arraybuffer" })
      .then((res) => ({ bytes: res.data, mime: res.headers["content-type"] })),

  listTemplates: (type) =>
    api.get(`${root}/pdf-templates`, { params: type ? { type } : {} }).then((res) => res.data.templates),

  // Retourne { templates, etablissement } ; chaque modèle porte un champ `editable`
  listTemplatesFull: () => api.get(`${root}/pdf-templates`).then((res) => res.data),

  getTemplate: (id) => api.get(`${root}/pdf-templates/${id}`).then((res) => res.data.template),

  createTemplate: (payload) => api.post(`${root}/pdf-templates`, payload).then((res) => res.data.template),

  createFromDefault: (payload) =>
    api.post(`${root}/pdf-templates/from-default`, payload).then((res) => res.data.template),

  updateTemplate: (id, payload) =>
    api.put(`${root}/pdf-templates/${id}`, payload).then((res) => res.data.template),

  deleteTemplate: (id) => api.delete(`${root}/pdf-templates/${id}`),
});

export const directeurPdfApi = templateApi("/directeur");

/**
 * Charge les logos référencés par les éléments image d'un layout.
 * @param {object} source api à utiliser (pdfApi par défaut, directeurPdfApi pour le directeur)
 * @returns {Promise<Object<number, {bytes: ArrayBuffer, mime: string}>>}
 */
export const fetchImagesForLayout = async (elements = [], source = null) => {
  const ids = [...new Set(elements.filter((el) => el.type === "image" && el.pdf_image_id).map((el) => el.pdf_image_id))];
  const entries = await Promise.all(ids.map(async (id) => [id, await (source ?? pdfApi).fetchImageBytes(id)]));
  return Object.fromEntries(entries);
};

export const pdfApi = {
  ...templateApi("/medecin"),

  getPdfData: (rendezVousId) => api.get(`${base}/pdf-data/${rendezVousId}`).then((res) => res.data),

  createDocument: (formData) =>
    api.post(`${base}/generated-documents`, formData).then((res) => res.data.document),
};
