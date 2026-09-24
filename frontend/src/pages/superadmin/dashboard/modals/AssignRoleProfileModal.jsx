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

const ROLE_LABELS = {
  medecin: "médecin",
  secretaire: "secrétaire",
  gestionnaire: "gestionnaire",
  directeur: "directeur",
};

// Le super admin doit renseigner la ligne de profil (medecin_profiles, secretaires,
// gestionnaires, directeurs) au moment de l'assignation, sinon le rôle n'est pas assigné.
const AssignRoleProfileModal = ({ userId, userName, role, onClose, onSuccess }) => {
  const [hopitaux, setHopitaux] = useState([]);
  const [specialites, setSpecialites] = useState([]);
  const [useNewHopital, setUseNewHopital] = useState(false);
  const [loading, setLoading] = useState(false);
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
    axiosInstance
      .get("/super-admin/hopitaux")
      .then((res) => setHopitaux(res.data.hopitaux || []))
      .catch((error) => console.error("Erreur chargement hôpitaux:", error));

    if (role === "medecin") {
      axiosInstance
        .get("/specialites")
        .then((res) => setSpecialites(res.data.specialites || []))
        .catch((error) => console.error("Erreur chargement spécialités:", error));
    }
  }, [role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload = { user_id: userId, role };

    if (role === "medecin") {
      if (!formData.specialite_id || !formData.telephone) {
        toast.warning("Veuillez remplir les champs requis");
        return;
      }
      payload = {
        ...payload,
        hopital_id: formData.hopital_id || null,
        specialite_id: formData.specialite_id,
        telephone: formData.telephone,
        adresse: formData.adresse || null,
        ville: formData.ville || null,
        description: formData.description || null,
      };
    } else if (role === "secretaire" || role === "gestionnaire") {
      if (!formData.name) {
        toast.warning("Veuillez renseigner le nom du profil");
        return;
      }
      payload = {
        ...payload,
        hopital_id: formData.hopital_id || null,
        name: formData.name,
      };
    } else if (role === "directeur") {
      if (!formData.name) {
        toast.warning("Veuillez renseigner le nom du profil");
        return;
      }
      if (!useNewHopital && !formData.hopital_id) {
        toast.warning("Veuillez sélectionner un hôpital ou en créer un nouveau");
        return;
      }
      if (
        useNewHopital &&
        (!formData.hopital_name ||
          !formData.hopital_adresse ||
          !formData.hopital_telephone ||
          !formData.hopital_ville)
      ) {
        toast.warning("Veuillez remplir toutes les informations de l'hôpital");
        return;
      }
      payload = {
        ...payload,
        name: formData.name,
        ...(useNewHopital
          ? {
              hopital_name: formData.hopital_name,
              hopital_adresse: formData.hopital_adresse,
              hopital_telephone: formData.hopital_telephone,
              hopital_ville: formData.hopital_ville,
            }
          : { hopital_id: formData.hopital_id }),
      };
    }

    setLoading(true);
    try {
      await axiosInstance.post("/super-admin/users/assign-role", payload);
      toast.success("Rôle assigné avec succès");
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'assignation du rôle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={largeModalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>
            Compléter le profil {ROLE_LABELS[role] || ""} de {userName}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalBodyStyle}>
          {role === "medecin" && (
            <>
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
                    value={formData.ville}
                    onChange={handleChange}
                    style={inputStyle}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              <div style={{ ...formGroupStyle, marginTop: "15px" }}>
                <label style={labelStyle}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  style={textareaStyle}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {(role === "secretaire" || role === "gestionnaire") && (
            <>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ ...formGroupStyle, marginTop: "15px" }}>
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
            </>
          )}

          {role === "directeur" && (
            <>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Nom complet *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={inputStyle}
                  disabled={loading}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "16px", margin: "15px 0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    checked={!useNewHopital}
                    onChange={() => setUseNewHopital(false)}
                    disabled={loading}
                  />
                  Hôpital existant
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    checked={useNewHopital}
                    onChange={() => setUseNewHopital(true)}
                    disabled={loading}
                  />
                  Créer un nouvel hôpital
                </label>
              </div>

              {!useNewHopital ? (
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Hôpital *</label>
                  <select
                    name="hopital_id"
                    value={formData.hopital_id}
                    onChange={handleChange}
                    style={inputStyle}
                    disabled={loading}
                    required
                  >
                    <option value="">Sélectionner un hôpital</option>
                    {hopitaux.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.ville ? `- ${h.ville}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div style={formRowStyle}>
                    <div style={formGroupStyle}>
                      <label style={labelStyle}>Nom de l'hôpital *</label>
                      <input
                        type="text"
                        name="hopital_name"
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
                        value={formData.hopital_telephone}
                        onChange={handleChange}
                        style={inputStyle}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
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
            {loading ? "Assignation en cours..." : "Assigner le rôle"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignRoleProfileModal;
