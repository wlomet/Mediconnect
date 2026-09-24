import { useState, useEffect, useRef } from "react";
import { Eye, Pencil, Key } from "react-bootstrap-icons";
import axiosInstance from "../../../../api/axios";
import { toast } from "react-toastify";
import ShowUserModal from "../modals/ShowUserModal";
import EditUserModal from "../modals/EditUserModal";
import ChangePasswordModal from "../modals/ChangePasswordModal";

const UserDataTable = ({ users }) => {
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

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

    tableRef.current.addEventListener('click', handleTableClick);

    return () => {
      if (tableRef.current) {
        tableRef.current.removeEventListener('click', handleTableClick);
      }
    };
  }, []);

  // Initialiser DataTables
  useEffect(() => {
    // Extraire les rôles uniques
    const roles = [...new Set(users.flatMap(user => user.roles.map(role => role.name)))];
    setAvailableRoles(roles.sort());

    // Détruire l'instance précédente si elle existe
    if (dataTableRef.current) {
      dataTableRef.current.destroy();
    }

    // Initialiser DataTables
    if (tableRef.current && window.$) {
      dataTableRef.current = window.$(tableRef.current).DataTable({
        data: users,
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
    }

    return () => {
      if (dataTableRef.current) {
        dataTableRef.current.destroy();
      }
    };
  }, [users]);

  // Appliquer le filtre de rôles
  useEffect(() => {
    if (dataTableRef.current && window.$ && users.length > 0) {
      const $ = window.$;
      const dt = dataTableRef.current;
      
      // Supprimer les anciens filtres personnalisés
      $.fn.dataTable.ext.search.pop();
      
      // Ajouter un nouveau filtre personnalisé
      if (selectedRole) {
        $.fn.dataTable.ext.search.push(
          function(settings, data, dataIndex) {
            const user = users[dataIndex];
            if (!user) return false;
            const role = user.roles[0]?.name || 'Aucun rôle';
            return role === selectedRole;
          }
        );
      }
      
      // Redessiner le tableau
      dt.draw();
    }
  }, [selectedRole, users]);

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
