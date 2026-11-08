import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import styles from "./ImpersonationBanner.module.css";

const ImpersonationBanner = () => {
  const { user, impersonatedBy, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [enCours, setEnCours] = useState(false);

  if (!user || !impersonatedBy) return null;

  const revenirAuSuperAdmin = async () => {
    setEnCours(true);
    try {
      await logout();
      navigate("/super-admin/dashboard");
    } catch (error) {
      console.error("Erreur lors du retour au compte superadmin:", error);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className={styles.banniere} role="status">
      <span>
        Connecté en tant que <strong>{user.name}</strong> ({user.role})
      </span>
      <button type="button" className={styles.bouton} onClick={revenirAuSuperAdmin} disabled={enCours}>
        Revenir à mon compte superadmin
      </button>
    </div>
  );
};

export default ImpersonationBanner;
