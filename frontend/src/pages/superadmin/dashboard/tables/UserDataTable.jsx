import { useState, useEffect, useRef, useContext } from "react";
import { Eye, Pencil, Key } from "react-bootstrap-icons";
import Swal from "sweetalert2";
import axiosInstance from "../../../../api/axios";
import { toast } from "react-toastify";
import { AuthContext } from "../../../../context/AuthContext";
import ShowUserModal from "../modals/ShowUserModal";
import EditUserModal from "../modals/EditUserModal";
import ChangePasswordModal from "../modals/ChangePasswordModal";

const UserDataTable = ({ users }) => {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const { user: currentUser } = useContext(AuthContext);
  const [localUsers, setLocalUsers] = useState(users);
  const [selectedRole, setSelectedRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Resynchroniser la copie locale quand la liste fournie par le parent change
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Activer/désactiver un compte utilisateur
  const handleToggleActive = async (userId, nextActive, checkboxEl) => {
    if (!nextActive) {
      const result = await Swal.fire({
        title: "Êtes-vous sûr ?",
        text: "Ce compte ne pourra plus se connecter tant qu'il n'est pas réactivé.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Oui, désactiver",
        cancelButtonText: "Annuler",
      });

      if (!result.isConfirmed) {
        checkboxEl.checked = true;
        return;
      }
    }

    try {
      await axiosInstance.put(`/super-admin/users/${userId}/status`, {
        is_active: nextActive,
      });
      toast.success(nextActive ? "Compte activé avec succès" : "Compte désactivé avec succès");
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === Number(userId) ? { ...u, is_active: nextActive } : u))
      );
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      toast.error(error.response?.data?.message || "Erreur lors du changement de statut");
      checkboxEl.checked = !nextActive;
    }
  };

  // Récupérer les détails d'un utilisateur via API
  const fetchUserDetails = async (userId) => {
    setLoadingModal(true);
    try {
      const response = await axiosInstance.get(`/super-admin/users/${userId}`);
      setSelectedUserData(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      toast.error("Erreur lors de la récupération des données");
      return null;
    } finally {
      setLoadingModal(false);
    }
  };

  const handleShowUser = async (userId) => {
    const userData = await fetchUserDetails(userId);
    if (userData) {
      setShowModal(true);
    }
  };

  const handleEditUser = async (userId) => {
    const userData = await fetchUserDetails(userId);
    if (userData) {
      setEditFormData({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || "",
        address: userData.address || "",
      });
      setEditModal(true);
    }
  };

  const handleChangePasswordUser = async (userId) => {
    const userData = await fetchUserDetails(userId);
    if (userData) {
      setSelectedUserData(userData);
      setChangePasswordModal(true);
    }
  };

  // Gérer les clics sur le tableau (délégation d'événements)
  useEffect(() => {
    if (!tableRef.current) return;

    const handleTableClick = (e) => {
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');
      const btnPassword = e.target.closest('.btn-password');

      if (btnView) {
        handleShowUser(btnView.dataset.userId);
      } else if (btnEdit) {
        handleEditUser(btnEdit.dataset.userId);
      } else if (btnPassword) {
        handleChangePasswordUser(btnPassword.dataset.userId);
      }
    };

    const handleTableChange = (e) => {
      const switchInput = e.target.closest('.switch-input');
      if (switchInput) {
        handleToggleActive(switchInput.dataset.userId, switchInput.checked, switchInput);
      }
    };

    tableRef.current.addEventListener('click', handleTableClick);
    tableRef.current.addEventListener('change', handleTableChange);

    return () => {
      if (tableRef.current) {
        tableRef.current.removeEventListener('click', handleTableClick);
        tableRef.current.removeEventListener('change', handleTableChange);
      }
    };
  }, []);

  // Initialiser DataTables une seule fois (les données sont ensuite mises à jour via l'API DataTables, sans destroy/recreate)
  const currentUserIdRef = useRef(currentUser?.id);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser]);

  useEffect(() => {
    if (!tableRef.current || !window.$) return;

    dataTableRef.current = window.$(tableRef.current).DataTable({
      data: [],
      columns: [
        { data: 'id', title: 'ID' },
        { data: 'name', title: 'Nom' },
        { data: 'email', title: 'Email' },
        {
          data: null,
          title: 'Rôle',
          render: (data) => {
            return data.roles[0]?.name || 'Aucun rôle';
          }
        },
        {
          data: null,
          title: 'Statut',
          orderable: false,
          render: (data) => {
            const isSelf = currentUserIdRef.current && Number(currentUserIdRef.current) === Number(data.id);
            return `
              <label class="switch" title="${isSelf ? 'Vous ne pouvez pas désactiver votre propre compte' : ''}">
                <input type="checkbox" class="switch-input" data-user-id="${data.id}" ${data.is_active ? 'checked' : ''} ${isSelf ? 'disabled' : ''} />
                <span class="switch-slider"></span>
              </label>
            `;
          }
        },
        {
          data: null,
          title: 'Actions',
          orderable: false,
          render: (data) => {
            return `
              <div style="display: flex; gap: 8px;">
                <button class="btn-action btn-view" data-user-id="${data.id}" title="Voir les détails">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn-action btn-edit" data-user-id="${data.id}" title="Éditer l'utilisateur">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-action btn-password" data-user-id="${data.id}" title="Changer le mot de passe">
                  <i class="bi bi-key"></i>
                </button>
              </div>
            `;
          }
        }
      ],
      pageLength: 10,
      responsive: true,
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json'
      },
      dom: 'lrtip'
    });

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      }
    };
  }, []);

  // Mettre à jour les données du tableau sans le détruire/recréer
  useEffect(() => {
    // Extraire les rôles uniques
    const roles = [...new Set(localUsers.flatMap(user => user.roles.map(role => role.name)))];
    setAvailableRoles(roles.sort());

    if (dataTableRef.current) {
      dataTableRef.current.clear();
      dataTableRef.current.rows.add(localUsers);
      dataTableRef.current.draw(false);
    }
  }, [localUsers]);

  // Appliquer le filtre de rôles
  useEffect(() => {
    if (dataTableRef.current && window.$ && localUsers.length > 0) {
      const $ = window.$;
      const dt = dataTableRef.current;
      
      // Supprimer les anciens filtres personnalisés
      $.fn.dataTable.ext.search.pop();
      
      // Ajouter un nouveau filtre personnalisé
      if (selectedRole) {
        $.fn.dataTable.ext.search.push(
          function(settings, data, dataIndex) {
            const user = localUsers[dataIndex];
            if (!user) return false;
            const role = user.roles[0]?.name || 'Aucun rôle';
            return role === selectedRole;
          }
        );
      }
      
      // Redessiner le tableau
      dt.draw();
    }
  }, [selectedRole, localUsers]);

  const handleFormChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateUser = async () => {
    if (!editFormData) return;

    try {
      await axiosInstance.put(`/super-admin/users/${editFormData.id}`, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        address: editFormData.address,
      });
      toast.success("Utilisateur mis à jour avec succès");
      setEditModal(false);
      setEditFormData(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
      {/* Filtre de rôles */}
      <div style={{
        padding: "15px",
        backgroundColor: "#f9f9f9",
        borderRadius: "6px",
        border: "1px solid #ddd"
      }}>
        <label style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: "600",
          fontSize: "14px",
          color: "#333"
        }}>
          Filtrer par rôle:
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            width: "200px",
            boxSizing: "border-box",
            cursor: "pointer"
          }}
        >
          <option value="">Tous les rôles</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau DataTables */}
      <div style={{ overflowX: "auto" }}>
        <table
          ref={tableRef}
          style={{
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            borderCollapse: "collapse"
          }}
          className="display"
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
              <th>ID</th>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      {/* CSS pour les boutons d'actions */}
      <style>{`
        .btn-action {
          padding: 6px 10px;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        .btn-view {
          background-color: #4CAF50;
        }
        .btn-view:hover {
          background-color: #45a049;
        }
        .btn-edit {
          background-color: #2196F3;
        }
        .btn-edit:hover {
          background-color: #0b7dda;
        }
        .btn-password {
          background-color: #ff9800;
        }
        .btn-password:hover {
          background-color: #e68a00;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .switch-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: #f44336;
          border-radius: 24px;
          transition: background-color 0.2s;
        }
        .switch-slider::before {
          content: "";
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .switch input:checked + .switch-slider {
          background-color: #4CAF50;
        }
        .switch input:checked + .switch-slider::before {
          transform: translateX(18px);
        }
        .switch input:disabled + .switch-slider {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button {
          padding: 6px 10px;
          margin: 0 2px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #fff;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
          background-color: #f0f0f0;
        }
        .dataTables_wrapper .dataTables_paginate .paginate_button.current {
          background-color: #1976d2;
          color: white;
          border-color: #1976d2;
        }
      `}</style>

      {/* Modals */}
      <ShowUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userData={selectedUserData}
        loading={loadingModal}
      />

      <EditUserModal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        formData={editFormData}
        onFormChange={handleFormChange}
        onSave={handleUpdateUser}
        loading={loadingModal}
      />

      {changePasswordModal && selectedUserData && (
        <ChangePasswordModal
          user={selectedUserData}
          onClose={() => {
            setChangePasswordModal(false);
            setSelectedUserData(null);
          }}
          onSuccess={() => {
            // Recharger les données si nécessaire
          }}
        />
      )}
    </div>
  );
};

export default UserDataTable;
