import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import AntecedentOptionModal from "./AntecedentOptionModal";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../SuperAdminPages.module.css";

const AntecedentsSuperAdmin = () => {
  const [data, setData] = useState({ options: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  // null : fermée ; "new" : création ; objet : édition
  const [edition, setEdition] = useState(null);

  const charger = useCallback(async () => {
    try {
      setData(await superAdminApi.listAntecedents());
    } catch {
      toast.error("Impossible de charger les antécédents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const groupes = useMemo(
    () =>
      data.categories
        .filter((categorie) => !filtreCategorie || categorie === filtreCategorie)
        .map((categorie) => ({
          categorie,
          options: data.options.filter((option) => option.categorie === categorie),
        })),
    [data, filtreCategorie]
  );

  const basculerActif = async (option) => {
    try {
      await superAdminApi.updateAntecedent(option.id, {
        categorie: option.categorie,
        libelle: option.libelle,
        est_aucun: option.est_aucun,
        actif: !option.actif,
      });
      charger();
    } catch {
      toast.error("Mise à jour impossible");
    }
  };

  const supprimer = async (option) => {
    const result = await Swal.fire({
      title: "Supprimer cette option ?",
      text:
        option.patients_count > 0
          ? `${option.patients_count} patient(s) l'ont cochée : leurs réponses seront supprimées.`
          : "Aucun patient ne l'a cochée.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;

    try {
      await superAdminApi.deleteAntecedent(option.id);
      toast.success("Option supprimée");
      charger();
    } catch {
      toast.error("Suppression impossible");
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
            <h1 className={styles.title}>Antécédents</h1>
            <p className={styles.subtitle}>Options proposées aux patients dans leur dossier médical</p>
          </div>
          <button type="button" className={styles.primaryButton} onClick={() => setEdition("new")}>
            + Ajouter une option
          </button>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.field}>
            Catégorie
            <select
              className={styles.input}
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {data.categories.map((categorie) => (
                <option key={categorie} value={categorie}>
                  {categorie}
                </option>
              ))}
            </select>
          </label>
        </div>

        {groupes.map(({ categorie, options }) => (
          <section key={categorie} className={styles.section}>
            <h2 className={styles.sectionTitle}>{categorie}</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Libellé</th>
                    <th>Code</th>
                    <th>Statut</th>
                    <th>Patients</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((option) => (
                    <tr key={option.id}>
                      <td>
                        {option.libelle}{" "}
                        {option.est_aucun && <span className={`${styles.badge} ${styles.badgeWarn}`}>Aucun</span>}
                      </td>
                      <td className={styles.muted}>{option.code}</td>
                      <td>
                        <span className={`${styles.badge} ${option.actif ? styles.badgeOk : styles.badgeOff}`}>
                          {option.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>{option.patients_count}</td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button type="button" className={styles.smallButton} onClick={() => setEdition(option)}>
                            Modifier
                          </button>
                          <button type="button" className={styles.smallButton} onClick={() => basculerActif(option)}>
                            {option.actif ? "Désactiver" : "Activer"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.smallButton} ${styles.smallDanger}`}
                            onClick={() => supprimer(option)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {groupes.length === 0 && <p className={styles.empty}>Aucune option.</p>}
      </div>

      {edition && (
        <AntecedentOptionModal
          option={edition === "new" ? null : edition}
          categories={data.categories}
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

export default AntecedentsSuperAdmin;
