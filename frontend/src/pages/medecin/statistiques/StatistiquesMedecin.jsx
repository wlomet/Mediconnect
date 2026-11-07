import NavbarMedecin from "../components/NavbarMedecin";
import { formatMontant } from "../consultations/consultationFormat";
import { statistiqueApi } from "../../../api/statistiqueApi";
import GraphiqueStatistique from "./GraphiqueStatistique";
import styles from "./StatistiquesMedecin.module.css";

const formatArrondi = (valeur) => Math.round(valeur).toLocaleString("fr-FR");

const GRAPHIQUES = [
  {
    id: "rendez-vous",
    titre: "Rendez-vous confirmés et annulés",
    nomFichier: "rendez-vous",
    charger: statistiqueApi.rendezVous,
    type: "courbes",
    unite: "Nombre",
    series: [
      { cle: "confirmes", libelle: "Confirmés", couleur: "#10b981" },
      { cle: "annules", libelle: "Annulés", couleur: "#ef4444" },
    ],
  },
  {
    id: "consultations",
    titre: "Consultations terminées et abandonnées",
    nomFichier: "consultations",
    charger: statistiqueApi.consultations,
    type: "courbes",
    unite: "Nombre",
    series: [
      { cle: "terminees", libelle: "Terminées", couleur: "#2563eb" },
      { cle: "abandonnees", libelle: "Abandonnées", couleur: "#f59e0b" },
    ],
  },
  {
    id: "documents",
    titre: "Ordonnances et factures",
    nomFichier: "ordonnances-factures",
    charger: statistiqueApi.documents,
    type: "courbes",
    unite: "Nombre",
    series: [
      { cle: "ordonnances", libelle: "Ordonnances", couleur: "#8b5cf6" },
      { cle: "factures", libelle: "Factures", couleur: "#0ea5e9" },
    ],
  },
  {
    id: "montants",
    titre: "Montant des factures (XOF)",
    nomFichier: "montant-factures",
    charger: statistiqueApi.factures,
    type: "barres",
    unite: "XOF",
    series: [{ cle: "montant", libelle: "Montant", couleur: "#059669" }],
    formaterValeur: formatArrondi,
    resume: (donnees) =>
      `Total facturé : ${formatMontant(donnees.points.reduce((somme, point) => somme + point.montant, 0))}`,
  },
];

const StatistiquesMedecin = () => (
  <div className={styles.page}>
    <NavbarMedecin />

    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Statistiques</h1>
        <p className={styles.subtitle}>
          Chaque graphique a sa propre période. Le bouton « Exporter en PNG » enregistre le graphique en image.
        </p>
      </header>

      <div className={styles.grille}>
        {GRAPHIQUES.map(({ id, ...graphique }) => (
          <GraphiqueStatistique key={id} {...graphique} />
        ))}
      </div>
    </main>
  </div>
);

export default StatistiquesMedecin;
