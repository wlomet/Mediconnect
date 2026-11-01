import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import AssignRoleProfileModal from "../dashboard/modals/AssignRoleProfileModal";
import styles from "../dashboard/DashboardSuperAdmin.module.css";

// Rôles nécessitant une ligne de profil dédiée (medecin_profiles, secretaires, gestionnaires, directeurs)
const PROFILE_REQUIRED_ROLES = ["medecin", "secretaire", "gestionnaire", "directeur"];

const RolesSuperAdmin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [assignRoleModalOpen, setAssignRoleModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axiosInstance.get("/super-admin/users"),
        axiosInstance.get("/super-admin/roles"),
      ]);
      setUsers(usersRes.data.users);
      setRoles(rolesRes.data.roles);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        toast.error("Accès refusé - Réservé aux Super Admins");
        navigate("/login");
      } else {
        toast.error("Impossible de charger les rôles");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetSelection = () => {
    setSelectedUser("");
    setSelectedRole("");
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.warning("Veuillez sélectionner un utilisateur et un rôle");
      return;
    }

    try {
      // Le backend n'exige la ligne de profil que si elle n'existe pas déjà pour cet utilisateur
      await axiosInstance.post("/super-admin/users/assign-role", {
        user_id: selectedUser,
        role: selectedRole,
      });

      toast.success("Rôle assigné avec succès");
      fetchData();
      resetSelection();
    } catch (error) {
      // Une erreur 422 avec `errors` signifie que le profil est manquant et doit être complété
      if (
        PROFILE_REQUIRED_ROLES.includes(selectedRole) &&
        error.response?.status === 422 &&
        error.response?.data?.errors
      ) {
        setAssignRoleModalOpen(true);
        return;
      }

      console.error("Erreur:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'assignation du rôle");
    }
  };

  const handleAssignRoleProfileSuccess = () => {
    setAssignRoleModalOpen(false);
    fetchData();
    resetSelection();
  };

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Rôles</h1>
      </div>

      <div className={styles.section}>
        <h2>Assigner un rôle</h2>
        <div className={styles.assignForm}>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className={styles.select}>
            <option value="">Sélectionner un utilisateur</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email}) - Rôle actuel: {user.roles[0]?.name || "Aucun"}
              </option>
            ))}
          </select>

          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={styles.select}>
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

      {assignRoleModalOpen && selectedUser && (
        <AssignRoleProfileModal
          userId={selectedUser}
          userName={users.find((u) => String(u.id) === String(selectedUser))?.name || ""}
          role={selectedRole}
          onClose={() => setAssignRoleModalOpen(false)}
          onSuccess={handleAssignRoleProfileSuccess}
        />
      )}
    </div>
  );
};

export default RolesSuperAdmin;
