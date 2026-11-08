import { useEffect, useState } from "react";
import NavbarDirecteur from "../utils/navbar";
import api from "../../../api/axios";
import styles from "./ConsultationsDirecteur.module.css";

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "abandonnee", libelle: "Abandonnées" },
];

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

export default function ConsultationsDirecteur() {
  const [medecins, setMedecins] = useState([]);
  const [medecinId, setMedecinId] = useState("");
  const [filtre, setFiltre] = useState("");
  const [consultations, setConsultations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    api
      .get("/directeur/medecins-hopital")
      .then((res) => setMedecins(res.data.medecins || []))
      .catch((err) => console.error("Erreur lors du chargement des médecins :", err));
  }, []);

  useEffect(() => {
    let actif = true;
    const params = {
      ...(filtre ? { statut: filtre } : {}),
      ...(medecinId ? { medecin_id: medecinId } : {}),
    };

    api
      .get("/directeur/consultations", { params })
      .then((res) => {
        if (!actif) return;
        setConsultations(res.data.consultations || []);
        setErreur("");
      })
      .catch(() => {
        if (actif) setErreur("Impossible de charger les consultations");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });

    return () => {
      actif = false;
    };
  }, [filtre, medecinId]);

  return (
    <div className={styles.page}>
      <NavbarDirecteur />

      <main className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Consultations</h1>
          <p className={styles.subtitle}>Consultations des médecins de l'établissement. Consultation seule, aucune modification possible.</p>
        </header>

        <div className={styles.barre}>
          <div className={styles.tabs}>
            {FILTRES.map((f) => (
              <button
                key={f.valeur || "toutes"}
                type="button"
                className={`${styles.tab} ${filtre === f.valeur ? styles.tabActive : ""}`}
                onClick={() => {
                  setChargement(true);
                  setFiltre(f.valeur);
                }}
              >
                {f.libelle}
              </button>
            ))}
          </div>

          <label className={styles.champ}>
            Médecin
            <select
              value={medecinId}
              onChange={(e) => {
                setChargement(true);
                setMedecinId(e.target.value);
              }}
              className={styles.select}
            >
              <option value="">Tous les médecins</option>
              {medecins.map((m) => (
                <option key={m.id} value={m.id}>
                  Dr. {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {erreur && <p className={styles.error}>{erreur}</p>}
        {chargement && <p className={styles.empty}>Chargement des consultations...</p>}

        {!chargement && !erreur && consultations.length === 0 && (
          <p className={styles.empty}>Aucune consultation pour ces filtres.</p>
        )}

        {!chargement && consultations.length > 0 && (
          <div className={`${styles.card} ${styles.tableWrapper}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Médecin</th>
                  <th>Patient</th>
                  <th>Rendez-vous</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Ordonnance</th>
                  <th>Facture</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.id}>
                    <td>
                      Dr. {c.medecin.name}
                      <div className={styles.small}>{c.medecin.specialite}</div>
                    </td>
                    <td>{c.patient.nom}</td>
                    <td>{formatDateHeure(c.rendez_vous.date_debut)}</td>
                    <td>{formatDateHeure(c.heure_debut_reelle)}</td>
                    <td>{formatDateHeure(c.ended_at)}</td>
                    <td>{libelleOrdonnance(c)}</td>
                    <td>{libelleFacture(c)}</td>
                    <td>
                      <span className={`${styles.badge} ${BADGE_STATUT[c.statut]}`}>{STATUT_LABELS[c.statut]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
