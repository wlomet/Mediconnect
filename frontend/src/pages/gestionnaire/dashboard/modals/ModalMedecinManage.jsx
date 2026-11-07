import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../../api/axios";
import styles from "./ModalMedecinManage.module.css";

const ModalMedecinManage = ({ medecin, onClose }) => {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (showProfileModal) {
    return (
      <ModalProfileView
        medecin={medecin}
        onClose={() => setShowProfileModal(false)}
        onBack={() => setShowProfileModal(false)}
      />
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Gérer - Dr. {medecin.name}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.actionsGrid}>
            <div
              className={styles.actionCard}
              onClick={() => setShowProfileModal(true)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.actionIcon}>👤</div>
              <h3>Voir le Profil</h3>
              <p>Consulter les informations du médecin</p>
            </div>

            <div
              className={styles.actionCard}
              onClick={() => navigate(`/gestionnaire/planning?medecin=${medecin.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.actionIcon}>📅</div>
              <h3>Planning</h3>
              <p>Consulter et modifier le planning du médecin</p>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal pour voir le profil du médecin
const ModalProfileView = ({ medecin, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [medecin.id]);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get(`/gestionnaire/medecins/${medecin.id}/profile`);
      setProfile(response.data);
    } catch (error) {
      setError(error.response?.data?.message || "Erreur lors du chargement du profil");
      console.error("Erreur profil:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.subModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.subModalHeader}>
          <h3>Profil - Dr. {medecin.name}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        {loading && (
          <div className={styles.profileContent}>
            <p>Chargement...</p>
          </div>
        )}
        {error && (
          <div className={styles.profileContent}>
            <p style={{ color: "#dc2626" }}>{error}</p>
          </div>
        )}

        {profile && (
          <div className={styles.profileContent}>
            <div className={styles.profileField}>
              <label>Nom:</label>
              <p>{profile.name}</p>
            </div>
            <div className={styles.profileField}>
              <label>Spécialité:</label>
              <p>{profile.specialite || "Non spécifiée"}</p>
            </div>
            <div className={styles.profileField}>
              <label>Téléphone:</label>
              <p>{profile.telephone || "Non fourni"}</p>
            </div>
            <div className={styles.profileField}>
              <label>Adresse:</label>
              <p>{profile.adresse || "Non fournie"}</p>
            </div>
            <div className={styles.profileField}>
              <label>Ville:</label>
              <p>{profile.ville || "Non fournie"}</p>
            </div>
            <div className={styles.profileField}>
              <label>Description:</label>
              <p>{profile.description || "Aucune description"}</p>
            </div>
          </div>
        )}

        <div className={styles.subModalFooter}>
          <button className={styles.btnClose} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMedecinManage;
