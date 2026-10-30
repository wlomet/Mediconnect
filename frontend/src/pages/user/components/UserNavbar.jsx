import { useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import styles from "./UserNavbar.module.css";

const UserNavbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleDevelopment = (e) => {
    e.preventDefault();
    toast.warning("En développement", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarInner}>
        <div className={styles.navbarContent}>
          <div className={styles.logo}>
            <h1 className={styles.logoTitle}>Espace Client</h1>
          </div>

          <div className={styles.navLinks}>
            <a
              href="#rdv"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                navigate("/user/mes-rdv");
              }}
            >
              Mes Rendez-vous
            </a>
            <a href="#documents" className={styles.navLink} onClick={handleDevelopment}>
              Mes Documents
            </a>
            <a
              href="#profil"
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                navigate("/user/profile");
              }}
            >
              Mon Profil
            </a>
          </div>

          <div className={styles.userSection}>
            <span className={styles.userGreeting}>Bonjour, {user?.name}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <svg className={styles.logoutIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default UserNavbar;
