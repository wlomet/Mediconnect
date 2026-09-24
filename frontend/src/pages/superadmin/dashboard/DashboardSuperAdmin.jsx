import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import UserDataTable from "./tables/UserDataTable";
import CreateDirectorModal from "./modals/CreateDirectorModal";
import CreateAdminModal from "./modals/CreateAdminModal";
import CreateClientModal from "./modals/CreateClientModal";
import CreateGestionnaireModal from "./modals/CreateGestionnaireModal";
import CreateSecretaireModal from "./modals/CreateSecretaireModal";
import CreateMedecinModal from "./modals/CreateMedecinModal";
import styles from "./DashboardSuperAdmin.module.css";

const CREATE_ROLE_BUTTONS = [
  { key: "directeur", label: "+ Créer un Directeur" },
  { key: "admin", label: "+ Créer un Admin" },
  { key: "medecin", label: "+ Créer un Médecin" },
  { key: "gestionnaire", label: "+ Créer un Gestionnaire" },
  { key: "secretaire", label: "+ Créer un(e) Secrétaire" },
  { key: "client", label: "+ Créer un Client" },
];

const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [activeCreateModal, setActiveCreateModal] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, usersRes, rolesRes] = await Promise.all([
        axiosInstance.get("/super-admin/dashboard"),
        axiosInstance.get("/super-admin/users"),
        axiosInstance.get("/super-admin/roles"),
      ]);

      setStats(dashboardRes.data.stats);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        toast.error("Accès refusé - Réservé aux Super Admins");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.warning("Veuillez sélectionner un utilisateur et un rôle");
      return;
    }

    try {
      await axiosInstance.post("/super-admin/users/assign-role", {
        user_id: selectedUser,
        role: selectedRole,
      });

      toast.success("Rôle assigné avec succès");
      fetchDashboardData(); // Recharger les données
      setSelectedUser(null);
      setSelectedRole("");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'assignation du rôle");
    }
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔐 Super Admin Dashboard</h1>
        <button onClick={() => navigate("/")} className={styles.btnBack}>
          Retour
        </button>
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

      {/* Gestion des rôles */}
      <div className={styles.section}>
        <h2>Assigner un rôle</h2>
        <div className={styles.assignForm}>
          <select
            value={selectedUser || ""}
            onChange={(e) => setSelectedUser(e.target.value)}
            className={styles.select}
          >
            <option value="">Sélectionner un utilisateur</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email}) - Rôle actuel: {user.roles[0]?.name || "Aucun"}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={styles.select}
          >
            <option value="">Sélectionner un rôle</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name} ({role.users_count} utilisateurs)
              </option>
            ))}
          </select>

          <button onClick={handleAssignRole} className={styles.btnAssign}>
            Assigner le rôle
          </button>
        </div>
      </div>

      {/* Création d'utilisateurs par rôle */}
      <div className={styles.section}>
        <h2 style={{ marginTop: 0 }}>Créer un utilisateur</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {CREATE_ROLE_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setActiveCreateModal(btn.key)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1976d2",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: "0.95rem",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1565c0")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#1976d2")}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className={styles.section}>
        <h2 style={{ margin: "0 0 15px 0" }}>Tous les utilisateurs</h2>
        <UserDataTable users={users} />
      </div>

      {/* Liste des rôles */}
      <div className={styles.section}>
        <h2>Tous les rôles</h2>
        <div className={styles.rolesGrid}>
          {roles.map((role) => (
            <div key={role.id} className={styles.roleCard}>
              <h3>{role.name}</h3>
              <p>{role.users_count} utilisateur(s)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals Créer Utilisateur */}
      {activeCreateModal === "directeur" && (
        <CreateDirectorModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
      {activeCreateModal === "admin" && (
        <CreateAdminModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
      {activeCreateModal === "medecin" && (
        <CreateMedecinModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
      {activeCreateModal === "gestionnaire" && (
        <CreateGestionnaireModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
      {activeCreateModal === "secretaire" && (
        <CreateSecretaireModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
      {activeCreateModal === "client" && (
        <CreateClientModal
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => fetchDashboardData()}
        />
      )}
    </div>
  );
};

export default DashboardSuperAdmin;
