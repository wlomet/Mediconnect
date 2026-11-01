import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import SpecialiteModal from "./SpecialiteModal";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../SuperAdminPages.module.css";

const SpecialitesSuperAdmin = () => {
  const [specialites, setSpecialites] = useState([]);
  const [loading, setLoading] = useState(true);
  // null : fermée ; "new" : création ; objet : édition
  const [edition, setEdition] = useState(null);

  const charger = useCallback(async () => {
    try {
      setSpecialites(await superAdminApi.listSpecialites());
    } catch {
      toast.error("Impossible de charger les spécialités");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const supprimer = async (specialite) => {
    const result = await Swal.fire({
      title: "Supprimer cette spécialité ?",
      text: "La suppression est refusée si un médecin l'utilise.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;

    try {
      await superAdminApi.deleteSpecialite(specialite.id);
      toast.success("Spécialité supprimée");
      charger();
    } catch (error) {
      toast.error(error.response?.data?.message || "Suppression impossible");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Spécialités</h1>
            <p className={styles.subtitle}>Spécialités proposées aux médecins et aux patients</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setEdition("new")}>
            + Ajouter une spécialité
          </button>
        </div>

        <section className={styles.section}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Médecins</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {specialites.map((specialite) => (
                  <tr key={specialite.id}>
                    <td>{specialite.nom}</td>
                    <td className={styles.muted}>{specialite.slug}</td>
                    <td className={styles.muted}>{specialite.description || "—"}</td>
                    <td>{specialite.medecins_count}</td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button type="button" className={styles.smallButton} onClick={() => setEdition(specialite)}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          className={`${styles.smallButton} ${styles.smallDanger}`}
                          onClick={() => supprimer(specialite)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {specialites.length === 0 && <p className={styles.empty}>Aucune spécialité.</p>}
          </div>
        </section>
      </div>

      {edition && (
        <SpecialiteModal
          specialite={edition === "new" ? null : edition}
          onClose={() => setEdition(null)}
          onSaved={() => {
            setEdition(null);
            charger();
          }}
        />
      )}
    </>
  );
};

export default SpecialitesSuperAdmin;
