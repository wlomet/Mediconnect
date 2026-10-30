import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthContext } from "../../../context/AuthContext";
import axiosInstance from "../../../api/axios";
import { validatePhone } from "../../../utils/phoneValidation";
import DirectorNavbar from "../utils/navbar";
import styles from "./HopitalInfo.module.css";
import { Building2, Loader } from "lucide-react";

const HopitalInfo = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hopitalData, setHopitalData] = useState({
    name: "",
    adresse: "",
    telephone: "",
    ville: "",
    email: "",
    description: "",
  });

  useEffect(() => {
    fetchHopitalData();
  }, []);

  const fetchHopitalData = async () => {
    try {
      const response = await axiosInstance.get("/directeur/hopital");
      const data = response.data.hopital;
      setHopitalData({
        name: data.name || "",
        adresse: data.adresse || "",
        telephone: data.telephone || "",
        ville: data.ville || "",
        email: data.email || "",
        description: data.description || "",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Impossible de charger les données de l'hôpital");
      if (error.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setHopitalData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneError = validatePhone(hopitalData.telephone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setSubmitting(true);

    try {
      await axiosInstance.put("/directeur/hopital", hopitalData);
      toast.success("Informations de l'hôpital mises à jour avec succès!");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <DirectorNavbar />
        <div className={styles.loadingContainer}>
          <Loader size={48} className={styles.spinner} />
          <p>Chargement...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DirectorNavbar />
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Building2 size={40} className={styles.icon} />
            <div>
              <h1 className={styles.title}>Informations de l'Hôpital</h1>
              <p className={styles.subtitle}>Gérez les détails de votre établissement</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Nom */}
            <div className={styles.formGroup}>
              <label htmlFor="name">Nom de l'Hôpital *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={hopitalData.name}
                onChange={handleChange}
                required
                placeholder="Hôpital Central"
                className={styles.input}
              />
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={hopitalData.email}
                onChange={handleChange}
                placeholder="contact@hopital.fr"
                className={styles.input}
              />
            </div>

            {/* Téléphone et Ville (2 colonnes) */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="telephone">Téléphone</label>
                <input
                  id="telephone"
                  type="tel"
                  name="telephone"
                  value={hopitalData.telephone}
                  onChange={handleChange}
                  placeholder="01 23 45 67 89"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="ville">Ville</label>
                <input
                  id="ville"
                  type="text"
                  name="ville"
                  value={hopitalData.ville}
                  onChange={handleChange}
                  placeholder="Paris"
                  className={styles.input}
                />
              </div>
            </div>

            {/* Adresse */}
            <div className={styles.formGroup}>
              <label htmlFor="adresse">Adresse Complète</label>
              <input
                id="adresse"
                type="text"
                name="adresse"
                value={hopitalData.adresse}
                onChange={handleChange}
                placeholder="123 Rue de la Santé"
                className={styles.input}
              />
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={hopitalData.description}
                onChange={handleChange}
                placeholder="Description de votre hôpital..."
                className={styles.textarea}
                rows="5"
              />
            </div>

            {/* Buttons */}
            <div className={styles.buttonGroup}>
              <button
                type="reset"
                className={styles.btnReset}
                onClick={fetchHopitalData}
                disabled={submitting}
              >
                Annuler
              </button>
              <button type="submit" className={styles.btnSubmit} disabled={submitting}>
                {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default HopitalInfo;
