import { toast } from "react-toastify";
import { clientDossierApi } from "../../../api/clientDossierApi";
import { downloadBlob } from "../../../utils/pdf/downloadBlob";

export const TYPE_DOCUMENT_LABELS = { ordonnance: "Ordonnance", facture: "Facture" };

export const STATUT_CONSULTATION_LABELS = {
  en_cours: "En cours",
  terminee: "Terminée",
  abandonnee: "Abandonnée",
};

export const STATUT_RENDEZ_VOUS_LABELS = {
  en_attente: "En attente",
  confirmé: "Confirmé",
  annulé: "Annulé",
  terminé: "Terminé",
};

const parseDate = (value) => (value ? new Date(String(value).replace(" ", "T")) : null);

export const formatDateHeure = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
};

export const formatMontant = (value) =>
  Number(value ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const telechargerDocument = async (doc) => {
  try {
    const blob = await clientDossierApi.downloadDocument(doc.id);
    downloadBlob(blob, `${doc.titre.replace(/[\\/:*?"<>|]/g, "-")}.pdf`);
  } catch {
    toast.error("Téléchargement impossible");
  }
};
