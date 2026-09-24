import { useState, useEffect } from "react";
import axiosInstance from "../../../../api/axios";
import { toast } from "react-toastify";
import {
  modalOverlayStyle,
  largeModalStyle,
  modalHeaderStyle,
  modalBodyStyle,
  modalFooterStyle,
  closeButtonStyle,
  labelStyle,
  inputStyle,
  textareaStyle,
  buttonCloseStyle,
  buttonPrimaryStyle,
  formRowStyle,
  formGroupStyle,
} from "../styles/modalStyles";

const CreateMedecinModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialite_id: "",
    telephone: "",
    hopital_id: "",
    adresse: "",
    ville: "",
    description: "",
  });
  const [specialites, setSpecialites] = useState([]);
  const [hopitaux, setHopitaux] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosInstance
      .get("/specialites")
      .then((res) => setSpecialites(res.data.specialites || []))
      .catch((error) => console.error("Erreur chargement spécialités:", error));

    axiosInstance
      .get("/super-admin/hopitaux")
      .then((res) => setHopitaux(res.data.hopitaux || []))
      .catch((error) => console.error("Erreur chargement hôpitaux:", error));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.specialite_id ||
      !formData.telephone
    ) {
      toast.warning("Veuillez remplir tous les champs requis");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/super-admin/medecins/create", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        specialite_id: formData.specialite_id,
        telephone: formData.telephone,
        hopital_id: formData.hopital_id || null,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        description: formData.description || null,
      });

      toast.success("Médecin créé avec succès");
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={largeModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Créer un Médecin</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalBodyStyle}>
          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Nom complet *</label>
              <input
                type="text"
                name="name"
                placeholder="Dr. Jean Dupont"
                value={formData.name}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                name="email"
                placeholder="medecin@example.com"
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Spécialité *</label>
              <select
                name="specialite_id"
                value={formData.specialite_id}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
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

            <div style={formGroupStyle}>
              <label style={labelStyle}>Téléphone *</label>
              <input
                type="tel"
                name="telephone"
                placeholder="0612345678"
                value={formData.telephone}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Hôpital (optionnel)</label>
              <select
                name="hopital_id"
                value={formData.hopital_id}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
              >
                <option value="">Aucun (indépendant)</option>
                {hopitaux.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.ville ? `- ${h.ville}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Ville</label>
              <input
                type="text"
                name="ville"
                placeholder="Paris"
                value={formData.ville}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Adresse</label>
              <input
                type="text"
                name="adresse"
                placeholder="123 Rue de la Santé"
                value={formData.adresse}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                placeholder="Présentation du médecin..."
                value={formData.description}
                onChange={handleChange}
                style={textareaStyle}
                disabled={loading}
              />
            </div>
          </div>

          <div style={formRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Mot de passe *</label>
              <input
                type="password"
                name="password"
                placeholder="Minimum 6 caractères"
                value={formData.password}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Confirmer mot de passe *</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmez le mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>
          </div>
        </form>

        <div style={modalFooterStyle}>
          <button onClick={onClose} style={buttonCloseStyle} disabled={loading}>
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...buttonPrimaryStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Création en cours..." : "Créer le Médecin"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMedecinModal;
