import { useContext, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { ChevronDown, LogOut } from "lucide-react";
import { NAV_ACCUEIL, NAV_GROUPES } from "./superAdminNavigation";
import styles from "./SuperAdminNavbar.module.css";

const SuperAdminNavbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupeOuvert, setGroupeOuvert] = useState(null);

  // Referme les menus à chaque changement de page
  useEffect(() => {
    setMenuOpen(false);
    setGroupeOuvert(null);
  }, [location.pathname]);

  // Referme le menu déroulant au clic extérieur et avec la touche Échap
  useEffect(() => {
    const fermerSiExterne = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setGroupeOuvert(null);
    };
    const fermerAvecEchap = (event) => {
      if (event.key === "Escape") setGroupeOuvert(null);
    };
    document.addEventListener("mousedown", fermerSiExterne);
    document.addEventListener("keydown", fermerAvecEchap);
    return () => {
      document.removeEventListener("mousedown", fermerSiExterne);
      document.removeEventListener("keydown", fermerAvecEchap);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
    navigate("/login");
  };

  const groupeContientActif = (liens) =>
    liens.some((lien) => location.pathname.startsWith(lien.to));

  const AccueilIcon = NAV_ACCUEIL.icon;

  return (
    <header className={styles.navbar} ref={navRef}>
      <div className={styles.container}>
        <div className={styles.brand}>MediConnect</div>

        <div className={styles.actions}>
          {user && <span className={styles.userName}>{user.name}</span>}
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>

        <button
          type="button"
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOuvert : ""}`}
          onClick={() => setMenuOpen((ouvert) => !ouvert)}
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
        >
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
          <span className={styles.hamburgerLine} />
        </button>

        <nav className={styles.liens}>
          <NavLink
            to={NAV_ACCUEIL.to}
            className={({ isActive }) => `${styles.lien} ${isActive ? styles.actif : ""}`}
          >
            <AccueilIcon size={18} />
            <span>{NAV_ACCUEIL.label}</span>
          </NavLink>

          {NAV_GROUPES.map((groupe) => {
            const Icon = groupe.icon;
            const ouvert = groupeOuvert === groupe.id;

            return (
              <div key={groupe.id} className={styles.groupe}>
                <button
                  type="button"
                  className={`${styles.groupeBouton} ${groupeContientActif(groupe.liens) ? styles.actif : ""}`}
                  aria-expanded={ouvert}
                  onClick={() => setGroupeOuvert(ouvert ? null : groupe.id)}
                >
                  <Icon size={18} />
                  <span>{groupe.label}</span>
                  <ChevronDown size={16} className={`${styles.chevron} ${ouvert ? styles.chevronOuvert : ""}`} />
                </button>

                {ouvert && (
                  <div className={styles.dropdown}>
                    {groupe.liens.map((lien) => {
                      const LienIcon = lien.icon;
                      return (
                        <NavLink
                          key={lien.to}
                          to={lien.to}
                          className={({ isActive }) => `${styles.dropdownLien} ${isActive ? styles.dropdownActif : ""}`}
                        >
                          <LienIcon size={18} />
                          <span>{lien.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {menuOpen && (
          <div className={styles.menuMobile}>
            <NavLink
              to={NAV_ACCUEIL.to}
              className={({ isActive }) => `${styles.mobileLien} ${isActive ? styles.mobileActif : ""}`}
            >
              <AccueilIcon size={18} />
              <span>{NAV_ACCUEIL.label}</span>
            </NavLink>

            {NAV_GROUPES.map((groupe) => {
              const Icon = groupe.icon;
              return (
                <div key={groupe.id}>
                  <p className={styles.mobileTitre}>
                    <Icon size={16} />
                    <span>{groupe.label}</span>
                  </p>
                  {groupe.liens.map((lien) => {
                    const LienIcon = lien.icon;
                    return (
                      <NavLink
                        key={lien.to}
                        to={lien.to}
                        className={({ isActive }) => `${styles.mobileLien} ${isActive ? styles.mobileActif : ""}`}
                      >
                        <LienIcon size={18} />
                        <span>{lien.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

export default SuperAdminNavbar;
