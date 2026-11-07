import { useEffect, useState } from "react";
import NavbarDirecteur from "../utils/navbar";
import api from "../../../api/axios";
import { paramsPeriode } from "../../../utils/dateHelpers";
import GraphiqueStatistique from "./GraphiqueStatistique";
import styles from "./StatistiquesDirecteur.module.css";

const BASE = "/directeur/statistiques";

// Chaque graphique interroge son endpoint avec sa période et le médecin choisi (vide = tous)
const chargerStatistique = (chemin) => ({ from, to, medecinId }) =>
  api
    .get(`${BASE}/${chemin}`, {
      params: { ...paramsPeriode({ from, to }), ...(medecinId ? { medecin_id: medecinId } : {}) },
    })
    .then((res) => res.data);

const formatMontant = (value) =>
  Number(value ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "XOF" });

const formatArrondi = (valeur) => Math.round(valeur).toLocaleString("fr-FR");

const GRAPHIQUES = [
  {
    id: "rendez-vous",
    titre: "Rendez-vous confirmés et annulés",
    nomFichier: "rendez-vous",
    charger: chargerStatistique("rendez-vous"),
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
    charger: chargerStatistique("consultations"),
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
    charger: chargerStatistique("documents"),
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
    charger: chargerStatistique("factures"),
    type: "barres",
    unite: "XOF",
    series: [{ cle: "montant", libelle: "Montant", couleur: "#059669" }],
    formaterValeur: formatArrondi,
    resume: (donnees) =>
      `Total facturé : ${formatMontant(donnees.points.reduce((somme, point) => somme + point.montant, 0))}`,
  },
];

export default function StatistiquesDirecteur() {
  const [medecins, setMedecins] = useState([]);
  const [medecinId, setMedecinId] = useState("");

  useEffect(() => {
    api
      .get("/directeur/medecins-hopital")
      .then((res) => setMedecins(res.data.medecins || []))
      .catch((err) => console.error("Erreur lors du chargement des médecins :", err));
  }, []);

  return (
    <div className={styles.page}>
      <NavbarDirecteur />

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Statistiques</h1>
          <p className={styles.subtitle}>
            Chaque graphique a sa propre période. Le bouton « Exporter en PNG » enregistre le graphique en image.
          </p>
          <label className={styles.champ}>
            Médecin
            <select value={medecinId} onChange={(e) => setMedecinId(e.target.value)} className={styles.input}>
              <option value="">Tous les médecins</option>
              {medecins.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {m.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        <div className={styles.grille}>
          {GRAPHIQUES.map(({ id, ...graphique }) => (
            <GraphiqueStatistique key={id} medecinId={medecinId} {...graphique} />
          ))}
        </div>
      </main>
    </div>
  );
}
