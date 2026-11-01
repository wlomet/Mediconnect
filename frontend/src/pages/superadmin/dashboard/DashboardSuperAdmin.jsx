import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import styles from "./DashboardSuperAdmin.module.css";
import SuperAdminAccesRapides from "../components/SuperAdminAccesRapides";

const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/super-admin/dashboard");
      setStats(res.data.stats);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        toast.error("Accès refusé - Réservé aux Super Admins");
        navigate("/login");
      } else {
        toast.error("Impossible de charger les statistiques");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔐 Super Admin Dashboard</h1>
      </div>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Utilisateurs</h3>
          <p className={styles.statNumber}>{stats?.total_users || 0}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Rôles</h3>
          <p className={styles.statNumber}>{stats?.total_roles || 0}</p>
        </div>
      </div>

      <SuperAdminAccesRapides />
    </div>
  );
};

export default DashboardSuperAdmin;
