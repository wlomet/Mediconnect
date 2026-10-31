import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import styles from "./navbar.module.css";
import { Menu, X, LogOut, Home, Users, BarChart3, Building2, FileText } from "lucide-react";

const DirectorNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erreur déconnexion:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/directeur/dashboard", label: "Dashboard", icon: Home },
    { path: "/directeur/create-users", label: "Personnel", icon: Users },
    { path: "/directeur/hopital", label: "Hopital", icon: Building2 },
    { path: "/directeur/pdf-templates", label: "Modèles PDF", icon: FileText },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo/Brand */}
        <div className={styles.brand}>
          <Building2 size={28} className={styles.logo} />
          <span className={styles.brandText}>Directeur</span>
        </div>

        {/* Desktop Navigation */}
        <ul className={styles.navLinks}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.path}>
                <button
                  onClick={() => navigate(link.path)}
                  className={`${styles.navLink} ${isActive(link.path) ? styles.active : ""}`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* User Info & Logout */}
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || "Directeur"}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button className={styles.menuToggle} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileLinks}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.path}>
                  <button
                    onClick={() => {
                      navigate(link.path);
                      setIsOpen(false);
                    }}
                    className={`${styles.mobileLink} ${isActive(link.path) ? styles.active : ""}`}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button onClick={handleLogout} className={styles.mobileLogout}>
                <LogOut size={18} />
                <span>Déconnexion</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default DirectorNavbar;
