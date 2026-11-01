import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import UserDataTable from "../dashboard/tables/UserDataTable";
import CreateDirectorModal from "../dashboard/modals/CreateDirectorModal";
import CreateAdminModal from "../dashboard/modals/CreateAdminModal";
import CreateClientModal from "../dashboard/modals/CreateClientModal";
import CreateGestionnaireModal from "../dashboard/modals/CreateGestionnaireModal";
import CreateSecretaireModal from "../dashboard/modals/CreateSecretaireModal";
import CreateMedecinModal from "../dashboard/modals/CreateMedecinModal";
import styles from "../dashboard/DashboardSuperAdmin.module.css";

const CREATE_MODALS = {
  directeur: CreateDirectorModal,
  admin: CreateAdminModal,
  medecin: CreateMedecinModal,
  gestionnaire: CreateGestionnaireModal,
  secretaire: CreateSecretaireModal,
  client: CreateClientModal,
};

const CREATE_ROLE_BUTTONS = [
  { key: "directeur", label: "+ Créer un Directeur" },
  { key: "admin", label: "+ Créer un Admin" },
  { key: "medecin", label: "+ Créer un Médecin" },
  { key: "gestionnaire", label: "+ Créer un Gestionnaire" },
  { key: "secretaire", label: "+ Créer un(e) Secrétaire" },
  { key: "client", label: "+ Créer un Client" },
];

const UtilisateursSuperAdmin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCreateModal, setActiveCreateModal] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/super-admin/users");
      setUsers(res.data.users);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        toast.error("Accès refusé - Réservé aux Super Admins");
        navigate("/login");
      } else {
        toast.error("Impossible de charger les utilisateurs");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  const CreateModal = activeCreateModal ? CREATE_MODALS[activeCreateModal] : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Utilisateurs</h1>
      </div>

      <div className={styles.section}>
        <h2 style={{ marginTop: 0 }}>Créer un utilisateur</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {CREATE_ROLE_BUTTONS.map((btn) => (
            <button key={btn.key} type="button" onClick={() => setActiveCreateModal(btn.key)} className={styles.btnCreate}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 style={{ margin: "0 0 15px 0" }}>Tous les utilisateurs</h2>
        <UserDataTable users={users} />
      </div>

      {CreateModal && (
        <CreateModal onClose={() => setActiveCreateModal(null)} onSuccess={fetchUsers} />
      )}
    </div>
  );
};

export default UtilisateursSuperAdmin;
