import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NavbarMedecin from "../components/NavbarMedecin";
import ModalDemarrerConsultation from "./ModalDemarrerConsultation";
import { consultationApi, extraireErreur } from "../../../api/consultationApi";
import PanneauExport from "../../../components/PanneauExport";
import { STATUT_LABELS, formatDateHeure, formatMontant } from "./consultationFormat";
import styles from "./Consultations.module.css";

const FILTRES = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "abandonnee", libelle: "Abandonnées" },
];

const BADGE_STATUT = {
  en_cours: styles.badgeEnCours,
  en_attente: styles.badgeEnAttente,
  abandonnee: styles.badgeAbandonnee,
  terminee: styles.badgeTerminee,
};

const ConsultationsListe = () => {
  const navigate = useNavigate();
  const [filtre, setFiltre] = useState("");
  const [version, setVersion] = useState(0);
  const [consultations, setConsultations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [nouvelleOuverte, setNouvelleOuverte] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let actif = true;

    consultationApi
      .list(filtre)
      .then((liste) => {
        if (!actif) return;
        setConsultations(liste);
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
  }, [filtre, version]);

  const reprendre = async (consultation) => {
    try {
      await consultationApi.reprendre(consultation.id);
      toast.success("Consultation reprise");
      navigate(`/medecin/consultations/${consultation.id}`);
    } catch (error) {
      toast.error(extraireErreur(error).message);
    }
  };

  const libelleOrdonnance = (c) => {
    if (c.ordonnance_texte) return "Oui";
    return c.ordonnance_decision === "non_generee" ? "Sans ordonnance" : "Non";
  };

  const libelleFacture = (c) => {
    if (c.facture) return formatMontant(c.facture.total);
    return c.facture_decision === "non_generee" ? "Sans facture" : "—";
  };

  const exporter = (options) => consultationApi.exporter({ ...options, statut: filtre });

  return (
    <div className={styles.page}>
      <NavbarMedecin />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Consultations</h1>
            <p className={styles.subtitle}>Consultations terminées, abandonnées, en attente et en cours</p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setShowExport((v) => !v)}
            >
              Exporter
            </button>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => setNouvelleOuverte(true)}>
              Nouvelle consultation
            </button>
          </div>
        </header>

        {showExport && (
          <div className="mb-4">
            <PanneauExport onExporter={exporter} />
          </div>
        )}

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

        {erreur && <p className={styles.error}>{erreur}</p>}
        {chargement && <p className={styles.empty}>Chargement des consultations...</p>}

        {!chargement && consultations.length === 0 && !erreur && (
          <p className={styles.empty}>Aucune consultation pour ce filtre.</p>
        )}

        {!chargement && consultations.length > 0 && (
          <div className={`${styles.card} ${styles.tableWrapper}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rendez-vous</th>
                  <th>Patient</th>
                  <th>Ordonnance</th>
                  <th>Facture</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {formatDateHeure(c.rendez_vous.date_debut)}
                      <div className={styles.small}>{c.rendez_vous.motif}</div>
                    </td>
                    <td>
                      {c.patient.nom}
                      <div className={styles.small}>{c.patient.email || c.patient.telephone || "—"}</div>
                    </td>
                    <td>{libelleOrdonnance(c)}</td>
                    <td>{libelleFacture(c)}</td>
                    <td>{formatDateHeure(c.heure_debut_reelle)}</td>
                    <td>{formatDateHeure(c.ended_at)}</td>
                    <td>
                      <span className={`${styles.badge} ${BADGE_STATUT[c.statut]}`}>{STATUT_LABELS[c.statut]}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link to={`/medecin/consultations/${c.id}`} className={styles.link}>
                          Voir
                        </Link>
                        {(c.statut === "abandonnee" || c.statut === "en_attente") && (
                          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => reprendre(c)}>
                            Reprendre
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {nouvelleOuverte && (
        <ModalDemarrerConsultation
          onClose={() => {
            setNouvelleOuverte(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};

export default ConsultationsListe;
