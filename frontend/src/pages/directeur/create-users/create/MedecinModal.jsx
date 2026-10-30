import { useState, useEffect } from "react";
import { X } from "lucide-react";
import axiosInstance from "../../../../api/axios";
import { validatePhone } from "../../../../utils/phoneValidation";
import styles from "./MedecinModal.module.css";

const MedecinModal = ({ isOpen, onClose, onSuccess, specialites }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialite_id: "",
    telephone: "",
    adresse: "",
    ville: "",
    description: "",
  });

  // Log pour déboguer
  useEffect(() => {
    if (isOpen) {
      console.log("MedecinModal opened, specialites:", specialites);
    }
  }, [isOpen, specialites]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const phoneError = validatePhone(form.telephone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/directeur/create-medecin", {
        name: form.name,
        email: form.email,
        password: form.password,
        specialite_id: form.specialite_id,
        telephone: form.telephone,
        adresse: form.adresse,
        ville: form.ville,
        description: form.description,
      });

      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        specialite_id: "",
        telephone: "",
        adresse: "",
        ville: "",
        description: "",
      });
      onSuccess("Médecin créé avec succès!");
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors de la création du médecin");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Ajouter un Médecin</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nom complet *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Dr. Jean Dupont"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="medecin@hopital.fr"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Spécialité *</label>
            <select
              name="specialite_id"
              value={form.specialite_id}
              onChange={handleChange}
              required
            >
              <option value="">Choisir une spécialité</option>
              {specialites && specialites.length > 0 ? (
                specialites.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.nom || spec.name}
                  </option>
                ))
              ) : (
                <option disabled>Aucune spécialité disponible</option>
              )}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Téléphone *</label>
            <input
              type="tel"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              required
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Adresse</label>
            <input
              type="text"
              name="adresse"
              value={form.adresse}
              onChange={handleChange}
              placeholder="123 Rue de la Santé"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Ville</label>
            <input
              type="text"
              name="ville"
              value={form.ville}
              onChange={handleChange}
              placeholder="Paris"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Biographie du médecin..."
              rows="3"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Mot de passe *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Confirmer mot de passe *</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={styles.btnCancel} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? "Création..." : "Créer Médecin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MedecinModal;
