import { fetchImagesForLayout, pdfApi } from "../../../api/pdfApi";
import { generatePdf } from "../../../utils/pdf/generatePdf";
import { normalizeLayout } from "../../../utils/pdf/layout";
import { valeursConsultation } from "./consultationPdf";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const LIBELLES = { ordonnance: "Ordonnance", facture: "Facture" };

// Premier modèle du type, comme celui proposé par défaut dans l'aperçu.
const archiverDocument = async (consultation, type) => {
  const modeles = await pdfApi.listTemplates(type);
  const modele = modeles.find((item) => item.type === type);

  if (!modele) {
    throw new Error(`Aucun modèle de ${type}`);
  }

  const texte = consultation.ordonnance_texte;
  const lignes = consultation.facture?.lignes ?? [];
  const modeleComplet = await pdfApi.getTemplate(modele.id);
  const layout = normalizeLayout(modeleComplet.layout);
  const donnees = await pdfApi.getPdfData(consultation.rendez_vous.id);
  const values = valeursConsultation(layout, { texte, lignes });
  const bytes = await generatePdf({
    layout,
    data: donnees,
    values,
    images: await fetchImagesForLayout(layout.elements ?? [], pdfApi),
  });

  if (bytes.byteLength > MAX_PDF_BYTES) {
    throw new Error("Document trop volumineux");
  }

  const formData = new FormData();
  formData.append("pdf", new File([bytes], `${type}.pdf`, { type: "application/pdf" }));
  formData.append("type", type);
  formData.append("consultation_id", consultation.id);
  formData.append("pdf_template_id", modeleComplet.id);
  formData.append("donnees", JSON.stringify(values));

  await pdfApi.createDocument(formData);
};

// Doit être appelé avant la clôture : l'API refuse de lier un document à une consultation terminée.
// Retourne les libellés des documents non archivés.
export const archiverDocumentsConsultation = async (consultation) => {
  const types = [];
  if (consultation.ordonnance_texte) types.push("ordonnance");
  if (consultation.facture?.lignes?.length) types.push("facture");

  const echecs = [];

  for (const type of types) {
    try {
      await archiverDocument(consultation, type);
    } catch (error) {
      console.error(`Archivage de la ${type} impossible :`, error);
      echecs.push(LIBELLES[type]);
    }
  }

  return echecs;
};
