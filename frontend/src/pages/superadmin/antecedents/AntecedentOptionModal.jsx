import { useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../SuperAdminPages.module.css";

const AntecedentOptionModal = ({ option, categories, onClose, onSaved }) => {
  const [form, setForm] = useState({
    categorie: option?.categorie ?? "",
    libelle: option?.libelle ?? "",
    est_aucun: option?.est_aucun ?? false,
    actif: option?.actif ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      if (option) {
        await superAdminApi.updateAntecedent(option.id, form);
      } else {
        await superAdminApi.createAntecedent(form);
      }
      toast.success(option ? "Option mise à jour" : "Option ajoutée");
      onSaved();
    } catch (error) {
      const premiereErreur = Object.values(error.response?.data?.errors ?? {})[0]?.[0];
      toast.error(premiereErreur || error.response?.data?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className={styles.modalTitle}>{option ? "Modifier l'option" : "Nouvelle option"}</h2>

        <label className={styles.field}>
          Catégorie
          <input
            className={styles.input}
            list="antecedent-categories"
            value={form.categorie}
            maxLength={255}
            required
            onChange={(e) => setForm({ ...form, categorie: e.target.value })}
          />
          <datalist id="antecedent-categories">
            {categories.map((categorie) => (
              <option key={categorie} value={categorie} />
            ))}
          </datalist>
        </label>

        <label className={styles.field}>
          Libellé
          <input
            className={styles.input}
            value={form.libelle}
            maxLength={255}
            required
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.est_aucun}
            onChange={(e) => setForm({ ...form, est_aucun: e.target.checked })}
          />
          Option « Aucun » (exclusive dans sa catégorie)
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.actif}
            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
          />
          Proposée aux patients
        </label>

        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AntecedentOptionModal;
