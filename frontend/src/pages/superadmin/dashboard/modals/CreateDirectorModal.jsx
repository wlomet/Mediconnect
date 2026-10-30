import { useState } from "react";
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
  sectionStyle,
  sectionTitleStyle,
} from "../styles/modalStyles";
import { validatePhone } from "../../../../utils/phoneValidation";

const CreateDirectorModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    hopital_name: "",
    hopital_adresse: "",
    hopital_telephone: "",
    hopital_ville: "",
    hopital_email: "",
    hopital_description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      toast.warning("Veuillez remplir tous les champs requis de l'utilisateur");
      return;
    }

    if (
      !formData.hopital_name ||
      !formData.hopital_adresse ||
      !formData.hopital_telephone ||
      !formData.hopital_ville
    ) {
      toast.warning("Veuillez remplir tous les champs requis de l'hôpital");
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

    const phoneError = validatePhone(formData.phone) || validatePhone(formData.hopital_telephone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/super-admin/directors/create", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        hopital_name: formData.hopital_name,
        hopital_adresse: formData.hopital_adresse,
        hopital_telephone: formData.hopital_telephone,
        hopital_ville: formData.hopital_ville,
        hopital_email: formData.hopital_email || null,
        hopital_description: formData.hopital_description || null,
      });

      toast.success("Directeur et hôpital créés avec succès");
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
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Créer un Directeur</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalBodyStyle}>
          {/* Section Utilisateur */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Informations de l'Utilisateur</h3>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Jean Dupont"
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
                  placeholder="directeur@example.com"
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
                <label style={labelStyle}>Téléphone *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="0612345678"
                  value={formData.phone}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
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
          </div>

          {/* Section Hôpital */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Informations de l'Hôpital</h3>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Nom de l'hôpital *</label>
                <input
                  type="text"
                  name="hopital_name"
                  placeholder="Hôpital Central de Paris"
                  value={formData.hopital_name}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Ville *</label>
                <input
                  type="text"
                  name="hopital_ville"
                  placeholder="Paris"
                  value={formData.hopital_ville}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Adresse *</label>
                <input
                  type="text"
                  name="hopital_adresse"
                  placeholder="123 Rue de la Santé"
                  value={formData.hopital_adresse}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Téléphone *</label>
                <input
                  type="tel"
                  name="hopital_telephone"
                  placeholder="0142345678"
                  value={formData.hopital_telephone}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div style={formRowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email de l'hôpital</label>
                <input
                  type="email"
                  name="hopital_email"
                  placeholder="contact@hopital.com"
                  value={formData.hopital_email}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Description de l'hôpital</label>
                <textarea
                  name="hopital_description"
                  placeholder="Description de l'établissement..."
                  value={formData.hopital_description}
                  onChange={handleChange}
                  style={textareaStyle}
                  disabled={loading}
                />
              </div>
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
            {loading ? "Création en cours..." : "Créer le Directeur"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateDirectorModal;
