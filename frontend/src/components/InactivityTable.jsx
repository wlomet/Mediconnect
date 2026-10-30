import { useEffect, useState } from "react";
import axiosInstance from "../api/axios";
import styles from "./InactivityTable.module.css";

const formatDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("fr-FR");

const InactivityTable = ({ endpoint }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    axiosInstance
      .get(endpoint)
      .then((response) => {
        if (!cancelled) setItems(response.data.items ?? []);
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des comptes inactifs:", err);
        if (!cancelled) setError("Impossible de charger la liste des comptes inactifs.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (loading) return <p className={styles.info}>Chargement...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (items.length === 0) {
    return <p className={styles.info}>Aucun compte ou établissement inactif à supprimer.</p>;
  }

  const sortedItems = [...items].sort(
    (a, b) => Number(b.overdue) - Number(a.overdue) || a.deadline.localeCompare(b.deadline)
  );

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Nom</th>
            <th>Dernière activité</th>
            <th>Suppression prévue le</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr
              key={`${item.type}-${item.id}`}
              className={item.overdue ? styles.rowOverdue : styles.rowSoon}
            >
              <td>{item.type === "user" ? "Compte" : "Établissement"}</td>
              <td>{item.label}</td>
              <td>{formatDate(item.last_activity)}</td>
              <td>{formatDate(item.deadline)}</td>
              <td>
                <span className={item.overdue ? styles.badgeOverdue : styles.badgeSoon}>
                  {item.overdue ? "À supprimer" : "Bientôt à supprimer"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InactivityTable;
