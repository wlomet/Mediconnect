import { useState, useEffect } from "react";
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

const CreateSecretaireModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    hopital_id: "",
  });
  const [hopitaux, setHopitaux] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      await axiosInstance.post("/super-admin/secretaires/create", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        hopital_id: formData.hopital_id || null,
      });

      toast.success("Secrétaire créé(e) avec succès");
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
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Créer un(e) Secrétaire</h2>
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
              placeholder="secretaire@example.com"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>

          <div style={{ ...formGroupStyle, marginBottom: "15px" }}>
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
            {loading ? "Création en cours..." : "Créer le/la Secrétaire"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSecretaireModal;
