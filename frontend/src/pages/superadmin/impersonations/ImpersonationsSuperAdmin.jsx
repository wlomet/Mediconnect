import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../SuperAdminPages.module.css";

const PAR_PAGE = 25;

const MOTIFS_FIN = {
  retour_superadmin: "Retour au superadmin",
  compte_desactive: "Compte désactivé",
  deconnexion: "Superadmin invalide",
};

const formaterDateHeure = (iso) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

const ImpersonationsSuperAdmin = () => {
  const [page, setPage] = useState(1);
  const [impersonations, setImpersonations] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let annule = false;
    setLoading(true);

    superAdminApi
      .listImpersonations({ page, per_page: PAR_PAGE })
      .then((data) => {
        if (annule) return;
        setImpersonations(data.impersonations);
        setPagination(data.pagination);
      })
      .catch(() => toast.error("Impossible de charger l'historique"))
      .finally(() => {
        if (!annule) setLoading(false);
      });

    return () => {
      annule = true;
    };
  }, [page]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connexions en tant qu'un utilisateur</h1>
          <p className={styles.subtitle}>Historique de toutes les sessions ouvertes ({pagination.total})</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Début</th>
                <th>Superadmin</th>
                <th>Compte ciblé</th>
                <th>Rôle</th>
                <th>Fin</th>
                <th>Motif de fin</th>
                <th>Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {impersonations.map((log) => (
                <tr key={log.id}>
                  <td>{formaterDateHeure(log.started_at)}</td>
                  <td>
                    {log.superadmin.name}
                    <div className={styles.muted}>{log.superadmin.email}</div>
                  </td>
                  <td>
                    {log.target.name}
                    <div className={styles.muted}>{log.target.email}</div>
                  </td>
                  <td>{log.target.role}</td>
                  <td>{log.ended_at ? formaterDateHeure(log.ended_at) : "Non clôturée"}</td>
                  <td>{MOTIFS_FIN[log.end_reason] ?? "—"}</td>
                  <td>{log.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className={styles.empty}>Chargement...</p>}
          {!loading && impersonations.length === 0 && (
            <p className={styles.empty}>Aucune connexion en tant qu'un utilisateur.</p>
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
  );
};

export default ImpersonationsSuperAdmin;
