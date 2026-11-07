import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import styles from "./rdv/SearchMedecin.module.css";

const PUBLIC_NAV_LINKS = [
  { to: "/", label: "Accueil" },
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/specialites", label: "Spécialités" },
  { to: "/etablissements", label: "Établissements" },
  { to: "/professionnels-de-sante", label: "Professionnels de santé" },
  { to: "/faq", label: "FAQ" },
  { to: "/statistiques", label: "Statistiques" },
  { to: "/contact", label: "Contact" },
];

const Navbar = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Referme le menu mobile à chaque changement de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navLinkClassName = ({ isActive }) =>
    isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo} onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <img
            src="/logo/fulllogo_transparent_nobuffer.png"
            alt="MediConnect Logo"
            style={{ height: "50px", objectFit: "contain" }}
          />
          <h1 className={styles.logoTitle}>MediConnect</h1>
        </div>

        <div className={styles.headerActions}>
          {loading ? (
            <div className={styles.headerLoading}>
              <div className={styles.headerSpinner}></div>
            </div>
          ) : user ? (
            <>
              <div className={styles.authActionsUser}>
                <span className={styles.userGreeting}>Bonjour, {user.name}</span>
                <Link to="/dashboard" className={styles.dashboardButton}>
                  <LayoutDashboard className={styles.dashboardIcon} />
                  <span>Espace personnel</span>
                </Link>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  <LogOut className={styles.logoutIcon} />
                  <span>Déconnexion</span>
                </button>
              </div>
              <button
                type="button"
                className={styles.mobileMenuButton}
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </>
          ) : (
            <>
              <div className={styles.authActions}>
                <Link to="/login" className={styles.loginButton}>
                  Se connecter
                </Link>
                <Link to="/register" className={styles.registerButton}>
                  S'inscrire
                </Link>
              </div>
              <button
                type="button"
                className={styles.mobileMenuButton}
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </button>
            </>
          )}
        </div>
      </div>

      <nav className={styles.navRow}>
        {PUBLIC_NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClassName}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {mobileMenuOpen && (
        <nav className={styles.mobileMenu}>
          {PUBLIC_NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClassName}>
              {link.label}
            </NavLink>
          ))}
          <div className={styles.mobileMenuDivider} />
          {user ? (
            <>
              <span className={styles.userGreeting}>Bonjour, {user.name}</span>
              <Link to="/dashboard" className={styles.navLink}>
                Espace personnel
              </Link>
              <button onClick={handleLogout} className={styles.mobileLogoutButton}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.navLink}>
                Se connecter
              </Link>
              <Link to="/register" className={styles.navLink}>
                S'inscrire
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
