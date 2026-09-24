import { useEffect, useState } from "react";
import axiosInstance from "../api/axios";
import { toast } from "react-toastify";
import styles from "./CompleteProfileForm.module.css";

const ROLE_LABELS = {
  medecin: "médecin",
  secretaire: "secrétaire",
  gestionnaire: "gestionnaire",
  directeur: "directeur",
};

// Formulaire affiché quand la ligne de profil (medecin_profiles, secretaires,
// gestionnaires, directeurs) liée au rôle de l'utilisateur est manquante.
const CompleteProfileForm = ({ role, onCompleted }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hopitals, setHopitals] = useState([]);
  const [specialites, setSpecialites] = useState([]);
  const [useNewHopital, setUseNewHopital] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hopital_id: "",
    specialite_id: "",
    telephone: "",
    adresse: "",
    ville: "",
    description: "",
    hopital_name: "",
    hopital_adresse: "",
    hopital_telephone: "",
    hopital_ville: "",
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axiosInstance.get("/profile-completion/status");
        setHopitals(res.data.hopitals || []);
        setSpecialites(res.data.specialites || []);
      } catch (error) {
        console.error("Erreur:", error);
        toast.error("Impossible de charger les informations du formulaire");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (role === "directeur" && !useNewHopital && !formData.hopital_id) {
      toast.warning("Veuillez sélectionner un hôpital ou en créer un nouveau");
      return;
    }

    let payload = { name: formData.name };

    if (role === "medecin") {
      if (!formData.specialite_id || !formData.telephone) {
        toast.warning("Veuillez remplir les champs requis");
        return;
      }
      payload = {
        hopital_id: formData.hopital_id || null,
        specialite_id: formData.specialite_id,
        telephone: formData.telephone,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        description: formData.description || null,
      };
    } else if (role === "secretaire" || role === "gestionnaire") {
      if (!formData.name) {
        toast.warning("Veuillez renseigner votre nom");
        return;
      }
      payload = {
        hopital_id: formData.hopital_id || null,
        name: formData.name,
      };
    } else if (role === "directeur") {
      if (!formData.name) {
        toast.warning("Veuillez renseigner votre nom");
        return;
      }
      payload = { name: formData.name };
      if (useNewHopital) {
        if (
          !formData.hopital_name ||
          !formData.hopital_adresse ||
          !formData.hopital_telephone ||
          !formData.hopital_ville
        ) {
          toast.warning("Veuillez remplir toutes les informations de l'hôpital");
          return;
        }
        payload = {
          ...payload,
          hopital_name: formData.hopital_name,
          hopital_adresse: formData.hopital_adresse,
          hopital_telephone: formData.hopital_telephone,
          hopital_ville: formData.hopital_ville,
        };
      } else {
        payload = { ...payload, hopital_id: formData.hopital_id };
      }
    }

    setSubmitting(true);
    try {
      await axiosInstance.post("/profile-completion", payload);
      toast.success("Profil complété avec succès");
      onCompleted && onCompleted();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Complétez votre profil</h1>
        <p className={styles.subtitle}>
          Votre compte {ROLE_LABELS[role] || ""} nécessite quelques informations
          supplémentaires avant de pouvoir accéder à votre espace.
        </p>

        <form onSubmit={handleSubmit}>
          {(role === "secretaire" || role === "gestionnaire" || role === "directeur") && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Nom complet *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={styles.input}
                disabled={submitting}
                required
              />
            </div>
          )}

          {role === "medecin" && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Spécialité *</label>
                <select
                  name="specialite_id"
                  value={formData.specialite_id}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={submitting}
                  required
                >
                  <option value="">Sélectionner une spécialité</option>
                  {specialites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Téléphone *</label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={submitting}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Hôpital (laisser vide si indépendant)</label>
                <select
                  name="hopital_id"
                  value={formData.hopital_id}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={submitting}
                >
                  <option value="">Indépendant</option>
                  {hopitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.ville ? `(${h.ville})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={submitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ville</label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={submitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.textarea}
                  disabled={submitting}
                />
              </div>
            </>
          )}

          {(role === "secretaire" || role === "gestionnaire") && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Hôpital (laisser vide si indépendant(e))</label>
              <select
                name="hopital_id"
                value={formData.hopital_id}
                onChange={handleChange}
                className={styles.select}
                disabled={submitting}
              >
                <option value="">Indépendant(e)</option>
                {hopitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.ville ? `(${h.ville})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === "directeur" && (
            <>
              <div className={styles.toggleRow}>
                <label>
                  <input
                    type="radio"
                    checked={!useNewHopital}
                    onChange={() => setUseNewHopital(false)}
                    disabled={submitting}
                  />
                  Hôpital existant
                </label>
                <label>
                  <input
                    type="radio"
                    checked={useNewHopital}
                    onChange={() => setUseNewHopital(true)}
                    disabled={submitting}
                  />
                  Créer un nouvel hôpital
                </label>
              </div>

              {!useNewHopital ? (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hôpital *</label>
                  <select
                    name="hopital_id"
                    value={formData.hopital_id}
                    onChange={handleChange}
                    className={styles.select}
                    disabled={submitting}
                    required
                  >
                    <option value="">Sélectionner un hôpital</option>
                    {hopitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.ville ? `(${h.ville})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nom de l'hôpital *</label>
                    <input
                      type="text"
                      name="hopital_name"
                      value={formData.hopital_name}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Adresse *</label>
                    <input
                      type="text"
                      name="hopital_adresse"
                      value={formData.hopital_adresse}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Téléphone *</label>
                    <input
                      type="tel"
                      name="hopital_telephone"
                      value={formData.hopital_telephone}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Ville *</label>
                    <input
                      type="text"
                      name="hopital_ville"
                      value={formData.hopital_ville}
                      onChange={handleChange}
                      className={styles.input}
                      disabled={submitting}
                      required
                    />
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Valider mon profil"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileForm;
