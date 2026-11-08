import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../api/axios";
import styles from "./ConsultationsDataTable.module.css";

const ENTITES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Le contenu vient de l'API : chaque texte est échappé avant insertion dans une cellule
const echapper = (valeur) => String(valeur ?? "").replace(/[&<>"']/g, (caractere) => ENTITES[caractere]);

const STATUT_LABELS = {
  en_cours: "En cours",
  en_attente: "En attente",
  abandonnee: "Abandonnée",
  terminee: "Terminée",
};

const BADGE_STATUT = {
  en_cours: styles.badgeEnCours,
  en_attente: styles.badgeEnAttente,
  abandonnee: styles.badgeAbandonnee,
  terminee: styles.badgeTerminee,
};

const formatDateHeure = (value) => {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

const formatMontant = (value) =>
  Number(value ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "XOF" });

const libelleOrdonnance = (c) => {
  if (c.ordonnance_decision === "generee") return "Oui";
  return c.ordonnance_decision === "non_generee" ? "Sans ordonnance" : "Non";
};

const libelleFacture = (c) => {
  if (c.facture_total !== null) return formatMontant(c.facture_total);
  return c.facture_decision === "non_generee" ? "Sans facture" : "—";
};

// Dans l'ordre des colonnes, qui correspond aux indices de tri attendus par le serveur
const creerColonnes = (avecEtablissement) => [
  { title: "Date de création", rendu: (c) => formatDateHeure(c.created_at) },
  {
    title: "Médecin",
    rendu: (c) => {
      const precisions = [c.medecin.specialite, avecEtablissement ? c.medecin.etablissement : null];
      const texte = precisions
        .filter(Boolean)
        .map((valeur) => echapper(valeur))
        .join(" · ");
      return `<strong>Dr. ${echapper(c.medecin.name)}</strong><div class="${styles.small}">${texte}</div>`;
    },
  },
  { title: "Patient", rendu: (c) => echapper(c.patient.nom) },
  { title: "Rendez-vous", rendu: (c) => formatDateHeure(c.rendez_vous.date_debut) },
  { title: "Début", rendu: (c) => formatDateHeure(c.heure_debut_reelle) },
  { title: "Fin", rendu: (c) => formatDateHeure(c.ended_at) },
  { title: "Ordonnance", triable: false, rendu: libelleOrdonnance },
  { title: "Facture", triable: false, rendu: libelleFacture },
  {
    title: "Statut",
    rendu: (c) => `<span class="${styles.badge} ${BADGE_STATUT[c.statut]}">${STATUT_LABELS[c.statut]}</span>`,
  },
];

// Tableau DataTables côté serveur (pagination, tri, recherche) ; statut, médecin et établissement viennent de la page
export default function ConsultationsDataTable({ racine, statut, medecinId, hopitalId, avecEtablissement = false }) {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const filtresRef = useRef({ statut, medecinId, hopitalId });

  // Recharge les données quand un filtre change, sans recréer le tableau
  useEffect(() => {
    filtresRef.current = { statut, medecinId, hopitalId };
    dataTableRef.current?.ajax.reload();
  }, [statut, medecinId, hopitalId]);

  useEffect(() => {
    if (!tableRef.current || !window.$) return undefined;

    dataTableRef.current = window.$(tableRef.current).DataTable({
      processing: true,
      serverSide: true,
      autoWidth: false,
      order: [[0, "desc"]],
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      columns: creerColonnes(avecEtablissement).map(({ title, triable = true, rendu }) => ({
        title,
        data: null,
        orderable: triable,
        render: (_valeur, _type, ligne) => rendu(ligne),
      })),
      ajax: (data, callback) => {
        const { statut: statutFiltre, medecinId: medecinFiltre, hopitalId: hopitalFiltre } = filtresRef.current;

        api
          .get(`${racine}/consultations/datatable`, {
            params: {
              draw: data.draw,
              start: data.start,
              length: data.length,
              "search[value]": data.search.value,
              "order[0][column]": data.order[0].column,
              "order[0][dir]": data.order[0].dir,
              ...(statutFiltre ? { statut: statutFiltre } : {}),
              ...(medecinFiltre ? { medecin_id: medecinFiltre } : {}),
              ...(hopitalFiltre ? { hopital_id: hopitalFiltre } : {}),
            },
          })
          .then((res) => callback(res.data))
          .catch(() => {
            toast.error("Impossible de charger les consultations");
            callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
          });
      },
      language: { url: "//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json" },
      dom:
        "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
    });

    return () => {
      dataTableRef.current?.destroy();
      dataTableRef.current = null;
    };
  }, [racine, avecEtablissement]);

  return <table ref={tableRef} className={styles.table} />;
}
