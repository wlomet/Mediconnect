import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import { telechargerCsv } from "../../../utils/csvExport";
import styles from "../SuperAdminPages.module.css";

const PAR_PAGE = 25;

const STATUTS = [
  { value: "en_attente", label: "En attente", badge: "badgeWarn" },
  { value: "confirmé", label: "Confirmé", badge: "badgeOk" },
  { value: "annulé", label: "Annulé", badge: "badgeDanger" },
  { value: "terminé", label: "Terminé", badge: "" },
];

const FILTRES_VIDES = { search: "", statut: "", hopital_id: "", medecin_id: "", from: "", to: "" };

// Retire les filtres vides pour ne pas les envoyer à l'API
const nettoyer = (filtres) => Object.fromEntries(Object.entries(filtres).filter(([, valeur]) => valeur !== ""));

const formaterDate = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");
const formaterHeure = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

const RendezVousSuperAdmin = () => {
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [rendezVous, setRendezVous] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [acteurs, setActeurs] = useState({ hopitaux: [], medecins: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Délai avant la recherche : pas de requête à chaque frappe
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltres((f) => (f.search === recherche ? f : { ...f, search: recherche }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [recherche]);

  useEffect(() => {
    superAdminApi
      .listActeurs()
      .then(setActeurs)
      .catch(() => toast.error("Impossible de charger les établissements et médecins"));
  }, []);

  useEffect(() => {
    let annule = false;
    setLoading(true);

    superAdminApi
      .listRendezVous({ ...nettoyer(filtres), page, per_page: PAR_PAGE })
      .then((data) => {
        if (annule) return;
        setRendezVous(data.rendez_vous);
        setPagination(data.pagination);
      })
      .catch(() => toast.error("Impossible de charger les rendez-vous"))
      .finally(() => {
        if (!annule) setLoading(false);
      });

    return () => {
      annule = true;
    };
  }, [filtres, page]);

  const modifierFiltre = (cle, valeur) => {
    setFiltres((f) => ({ ...f, [cle]: valeur }));
    setPage(1);
  };

  const reinitialiser = () => {
    setRecherche("");
    setFiltres(FILTRES_VIDES);
    setPage(1);
  };

  const exporter = async () => {
    try {
      setExporting(true);
      telechargerCsv(await superAdminApi.exportRendezVous(nettoyer(filtres)));
    } catch {
      toast.error("Export impossible");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Rendez-vous</h1>
            <p className={styles.subtitle}>Tous les rendez-vous de l'application ({pagination.total})</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={exporter} disabled={exporting}>
            {exporting ? "Export..." : "Exporter en CSV"}
          </button>
        </div>

        <section className={styles.section}>
          <div className={styles.toolbar}>
            <label className={styles.field}>
              Recherche
              <input
                className={styles.input}
                placeholder="Patient, médecin, motif..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </label>

            <label className={styles.field}>
              Statut
              <select className={styles.input} value={filtres.statut} onChange={(e) => modifierFiltre("statut", e.target.value)}>
                <option value="">Tous</option>
                {STATUTS.map((statut) => (
                  <option key={statut.value} value={statut.value}>
                    {statut.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Établissement
              <select
                className={styles.input}
                value={filtres.hopital_id}
                onChange={(e) => modifierFiltre("hopital_id", e.target.value)}
              >
                <option value="">Tous</option>
                {acteurs.hopitaux.map((hopital) => (
                  <option key={hopital.id} value={hopital.id}>
                    {hopital.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Médecin
              <select
                className={styles.input}
                value={filtres.medecin_id}
                onChange={(e) => modifierFiltre("medecin_id", e.target.value)}
              >
                <option value="">Tous</option>
                {acteurs.medecins.map((medecin) => (
                  <option key={medecin.id} value={medecin.id}>
                    {medecin.name}
                    {medecin.hopital ? ` (${medecin.hopital})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Du
              <input
                type="date"
                className={styles.input}
                value={filtres.from}
                onChange={(e) => modifierFiltre("from", e.target.value)}
              />
            </label>

            <label className={styles.field}>
              Au
              <input
                type="date"
                className={styles.input}
                value={filtres.to}
                onChange={(e) => modifierFiltre("to", e.target.value)}
              />
            </label>

            <button type="button" className={styles.secondaryButton} onClick={reinitialiser}>
              Réinitialiser
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Patient</th>
                  <th>Médecin</th>
                  <th>Spécialité</th>
                  <th>Établissement</th>
                  <th>Motif</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {rendezVous.map((rdv) => {
                  const statut = STATUTS.find((s) => s.value === rdv.statut);

                  return (
                    <tr key={rdv.id}>
                      <td>{formaterDate(rdv.date_debut)}</td>
                      <td>{formaterHeure(rdv.date_debut)}</td>
                      <td>
                        {rdv.patient}{" "}
                        {rdv.patient_inscrit && <span className={`${styles.badge} ${styles.badgeOk}`}>Compte</span>}
                        <div className={styles.muted}>{rdv.patient_email || rdv.patient_telephone || "—"}</div>
                      </td>
                      <td>{rdv.medecin || "—"}</td>
                      <td>{rdv.specialite || "—"}</td>
                      <td>{rdv.hopital || "Sans établissement"}</td>
                      <td>{rdv.motif}</td>
                      <td>
                        <span className={`${styles.badge} ${statut?.badge ? styles[statut.badge] : ""}`}>
                          {statut?.label ?? rdv.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <p className={styles.empty}>Chargement...</p>}
            {!loading && rendezVous.length === 0 && (
              <p className={styles.empty}>Aucun rendez-vous pour ces critères.</p>
            )}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </button>
            <span>
              Page {page} sur {pagination.last_page}
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={page >= pagination.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default RendezVousSuperAdmin;
