import { useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../SuperAdminPages.module.css";

const SpecialiteModal = ({ specialite, onClose, onSaved }) => {
  const [form, setForm] = useState({
    nom: specialite?.nom ?? "",
    description: specialite?.description ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      if (specialite) {
        await superAdminApi.updateSpecialite(specialite.id, form);
      } else {
        await superAdminApi.createSpecialite(form);
      }
      toast.success(specialite ? "Spécialité mise à jour" : "Spécialité ajoutée");
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
        <h2 className={styles.modalTitle}>{specialite ? "Modifier la spécialité" : "Nouvelle spécialité"}</h2>

        <label className={styles.field}>
          Nom
          <input
            className={styles.input}
            value={form.nom}
            maxLength={255}
            required
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          Description
          <textarea
            className={styles.input}
            rows={3}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        {specialite && <p className={styles.hint}>Le slug reste inchangé pour conserver les liens existants.</p>}

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

export default SpecialiteModal;
