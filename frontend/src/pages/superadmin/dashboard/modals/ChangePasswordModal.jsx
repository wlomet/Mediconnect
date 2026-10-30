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
  buttonSaveStyle,
  formGroupStyle,
  infoBoxStyle,
} from "../styles/modalStyles";

const ChangePasswordModal = ({ user, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.warning("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.put(`/super-admin/users/${user.id}/change-password`, {
        password: newPassword,
      });
      toast.success("Mot de passe changé avec succès");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors du changement de mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Changer le mot de passe</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={modalBodyStyle}>
          <div style={infoBoxStyle}>
            <strong>Utilisateur:</strong> {user.name} ({user.email})
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Nouveau mot de passe *</label>
            <input
              type="password"
              placeholder="Entrez le nouveau mot de passe"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Confirmer le mot de passe *</label>
            <input
              type="password"
              placeholder="Confirmez le mot de passe"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
            />
          </div>
        </div>

        <div style={modalFooterStyle}>
          <button onClick={onClose} style={buttonCloseStyle} disabled={loading}>
            Annuler
          </button>
          <button
            onClick={handleChangePassword}
            style={{
              ...buttonSaveStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Changement en cours..." : "Changer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
