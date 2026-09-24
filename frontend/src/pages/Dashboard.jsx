import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardUser from "./user/dashboard/DashboardUser";
import DashboardMedecin from "./medecin/dashboard/DashboardMedecin";
import DashboardAdmin from "./admin/dashboard/DashboardAdmin";
import DashboardGestionnaire from "./gestionnaire/dashboard/DashboardGestionnaire";
import DashboardSecretaire from "./secretaire/dashboard/DashboardSecretaire";
import DashboardSuperAdmin from "./superadmin/dashboard/DashboardSuperAdmin";
import DashboardDirecteur from "./directeur/dashboard/DashboardDirecteur";
import CompleteProfileForm from "./CompleteProfileForm";

const PROFILE_REQUIRED_ROLES = ["medecin", "secretaire", "gestionnaire", "directeur"];

const Dashboard = () => {
  const { user, loading, checkAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  // Rediriger si pas connecté
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Loader
  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  // Si pas d'utilisateur
  if (!user) {
    return null;
  }

  // Ligne de profil (medecin_profiles, secretaires, gestionnaires, directeurs) manquante
  if (PROFILE_REQUIRED_ROLES.includes(user.role) && user.profileComplete === false) {
    return <CompleteProfileForm role={user.role} onCompleted={checkAuth} />;
  }

  // Afficher le dashboard selon le rôle
  const renderDashboardByRole = () => {
    switch (user.role) {
      case "super-admin":
        return <DashboardSuperAdmin />;
      case "admin":
        return <DashboardAdmin />;
      case "medecin":
        return <DashboardMedecin />;
      case "gestionnaire":
        return <DashboardGestionnaire />;
      case "directeur":
        return <DashboardDirecteur />;
      case "secretaire":
        return <DashboardSecretaire />;
      case "client":
      default:
        return <DashboardUser />;
    }
  };

  return renderDashboardByRole();
};

export default Dashboard;

