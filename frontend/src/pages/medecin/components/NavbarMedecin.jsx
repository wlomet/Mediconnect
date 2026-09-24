import { useContext, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./NavbarMedecin.module.css";

const NavbarMedecin = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
          {/* Logo et titre */}
          <a href="/dashboard" className={styles.logoLink}>
            <div className={styles.logo}>
              <svg
                className={styles.logoIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h1 className={styles.logoTitle}>Espace Médecin</h1>
            </div>
          </a>

          {/* Hamburger Menu Button */}
          <button
            className={`${styles.hamburger} ${menuOpen ? styles.active : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>

          {/* Navigation links */}
          <div className={`${styles.navLinks} ${menuOpen ? styles.menuOpen : ""}`}>
            <a
              href="/dashboard"
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Tableau de bord
            </a>
            <a
              href="/medecin/planning"
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Planning
            </a>
            <a
              href="#patients"
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Dossiers Patients
            </a>
            <a
              href="#consultations"
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Consultations
            </a>
            <a
              href="/medecin/profile"
              className={styles.navLink}
              onClick={() => setMenuOpen(false)}
            >
              Mon Profil
            </a>
          </div>

          {/* User info */}
          <div className={styles.userInfo}>
            <span className={styles.userGreeting}>Dr. {user?.name}</span>
          </div>

          {/* Logout Button */}
          <button onClick={handleLogout} className={styles.logoutButton}>
            <svg
              className={styles.logoutIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
    </nav>
  );
};

export default NavbarMedecin;
