import { useState } from "react";
import axiosInstance from "../../../../api/axios";
import { toast } from "react-toastify";
import {
  modalOverlayStyle,
  modalStyle,
  modalHeaderStyle,
  modalBodyStyle,
  modalFooterStyle,
  closeButtonStyle,
  labelStyle,
  inputStyle,
  buttonCloseStyle,
  buttonPrimaryStyle,
  formGroupStyle,
} from "../styles/modalStyles";

const CreateClientModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
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
      await axiosInstance.post("/super-admin/clients/create", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
      });

      toast.success("Client créé avec succès");
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
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Créer un Client</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalBodyStyle}>
          <div style={{ ...formGroupStyle, marginBottom: "15px" }}>
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

          <div style={{ ...formGroupStyle, marginBottom: "15px" }}>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              name="email"
              placeholder="client@example.com"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>

          <div style={{ ...formGroupStyle, marginBottom: "15px" }}>
            <label style={labelStyle}>Téléphone</label>
            <input
              type="tel"
              name="phone"
              placeholder="0612345678"
              value={formData.phone}
              onChange={handleChange}
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div style={{ ...formGroupStyle, marginBottom: "15px" }}>
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
            {loading ? "Création en cours..." : "Créer le Client"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateClientModal;
