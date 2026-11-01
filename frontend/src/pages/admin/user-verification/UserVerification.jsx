import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import axios from "../../../api/axios";
import { toast } from "react-toastify";
import styles from "./UserVerification.module.css";

const UserVerification = () => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [documentsUser, setDocumentsUser] = useState(null);
  const tableRef = useRef(null);
  const datatableRef = useRef(null);

  const openDocument = async (id, type) => {
    try {
      const response = await axios.get(`/admin/utilisateurs/${id}/documents/${type}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error("Impossible d'afficher le document");
    }
  };

  useEffect(() => {
    initializeDataTable();

    return () => {
      if (datatableRef.current) {
        try {
          datatableRef.current.DataTable().destroy();
        } catch (e) {
          console.log("DataTables cleanup");
        }
      }
    };
  }, []);

  const initializeDataTable = () => {
    let attempts = 0;
    const maxAttempts = 150; // 15 secondes avec 100ms par tentative

    const checkAndInitialize = setInterval(() => {
      attempts++;

      const jQueryAvailable = typeof window.$ !== "undefined";
      const dataTablesAvailable = jQueryAvailable && window.$.fn.dataTable;
      const tableRefReady = tableRef.current;

      if (jQueryAvailable && dataTablesAvailable && tableRefReady) {
        clearInterval(checkAndInitialize);

        try {
          const $ = window.$;

          if (datatableRef.current) {
            try {
              datatableRef.current.DataTable().destroy();
            } catch (e) {
              // ignore
            }
          }

          datatableRef.current = $(tableRef.current).DataTable({
            processing: true,
            serverSide: true,
            autoWidth: false,
            columnDefs: [
              { width: "10%", targets: 0 },
              { width: "20%", targets: 1 },
              { width: "25%", targets: 2 },
              { width: "15%", targets: 3 },
              { width: "12%", targets: 4 },
              { width: "18%", targets: 5 },
            ],
            ajax: function (data, callback, settings) {
              const params = {
                draw: data.draw,
                start: data.start,
                length: data.length,
                "search[value]": data.search.value,
                "order[0][column]": data.order[0].column,
                "order[0][dir]": data.order[0].dir,
              };

              axios
                .get("/admin/utilisateurs-non-verifies", { params })
                .then((response) => {
                  setLoading(false);
                  callback(response.data);
                })
                .catch((error) => {
                  console.error("Erreur API:", error.message);
                  toast.error("Erreur lors du chargement des données");
                  setLoading(false);
                  callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                });
            },
            columns: [
              {
                title: "ID",
                data: "id",
              },
              {
                title: "Nom",
                data: "name",
                render: function (data, type, row) {
                  return `
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
                        ${data.charAt(0).toUpperCase()}
                      </div>
                      <span>${data}</span>
                    </div>
                  `;
                },
              },
              {
                title: "Email",
                data: "email",
              },
              {
                title: "Email vérifié",
                data: "email_verified",
                orderable: false,
                render: function (data) {
                  return data
                    ? '<span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#dcfce7; color:#166534;">Vérifié</span>'
                    : '<span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#fee2e2; color:#991b1b;">Non vérifié</span>';
                },
              },
              {
                title: "Téléphone",
                data: "phone",
                render: function (data) {
                  return data || "-";
                },
              },
              {
                title: "Rôle",
                data: "role",
                orderable: false,
                render: function (data) {
                  const roleColors = {
                    medecin: "background: rgba(0, 102, 204, 0.1); color: #0066cc;",
                    gestionnaire: "background: rgba(23, 162, 184, 0.1); color: #17a2b8;",
                    secretaire: "background: rgba(111, 66, 193, 0.1); color: #6f42c1;",
                    directeur: "background: rgba(51, 51, 51, 0.1); color: #333;",
                    client: "background: rgba(40, 167, 69, 0.1); color: #28a745;",
                    admin: "background: rgba(220, 53, 69, 0.1); color: #dc3545;",
                  };
                  const style =
                    roleColors[data.toLowerCase()] ||
                    "background: rgba(128, 128, 128, 0.1); color: #666;";
                  return `<span style="${style} display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">${data}</span>`;
                },
              },
              {
                title: "Date d'enregistrement",
                data: "created_at",
              },
            ],
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            language: {
              url: "//cdn.datatables.net/plug-ins/1.13.7/i18n/fr-FR.json",
            },
            dom:
              "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
              "<'row'<'col-sm-12'tr>>" +
              "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            initComplete: function () {
              addActionColumn();
            },
            drawCallback: function () {
              addActionColumn();
            },
          });
        } catch (error) {
          console.error("Erreur DataTable:", error.message);
          toast.error("Erreur lors du chargement du tableau");
          setLoading(false);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkAndInitialize);
        console.error("DataTables non disponible après", attempts, "tentatives", {
          jQuery: jQueryAvailable,
          DataTables: dataTablesAvailable,
          TableRef: tableRefReady,
        });
        setLoading(false);
        toast.error("Impossible de charger la bibliothèque DataTables");
      }
    }, 100);
  };

  const addActionColumn = () => {
    const $ = window.$;
    const table = $(tableRef.current).DataTable();
    const rows = table.rows({ page: "current" }).nodes();

    $(rows).each(function (index) {
      const rowData = table.row(this).data();
      const actionsCell = $(this).find("td").last();

      // Vider la cellule si elle existe déjà
      if (actionsCell.find(".action-buttons").length === 0) {
        actionsCell.html(`
          <div class="action-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-docs" data-id="${rowData.id}" data-name="${rowData.name}"
              data-identite="${rowData.has_document_identite}" data-justificatif="${rowData.has_justificatif_validite}"
              title="Consulter les documents"
              style="padding: 8px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 200ms ease;">
              Documents
            </button>
            <button class="btn-verify" data-id="${rowData.id}" data-name="${rowData.name}" 
              title="Vérifier l'utilisateur" 
              style="padding: 8px 12px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 200ms ease;">
              ✓ Vérifier
            </button>
            <button class="btn-reject" data-id="${rowData.id}" data-name="${rowData.name}" 
              title="Rejeter l'utilisateur" 
              style="padding: 8px 12px; background-color: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 200ms ease;">
              ✕ Rejeter
            </button>
          </div>
        `);
      }
    });

    attachActionHandlers();
  };

  const attachActionHandlers = () => {
    const $ = window.$;
    $(".btn-verify")
      .off("click")
      .on("click", function () {
        const userId = $(this).data("id");
        const userName = $(this).data("name");
        handleVerifyUser(userId, userName);
      });

    $(".btn-reject")
      .off("click")
      .on("click", function () {
        const userId = $(this).data("id");
        const userName = $(this).data("name");
        handleRejectUser(userId, userName);
      });

    $(".btn-docs")
      .off("click")
      .on("click", function () {
        setDocumentsUser({
          id: $(this).data("id"),
          name: $(this).data("name"),
          hasIdentite: $(this).data("identite") === true,
          hasJustificatif: $(this).data("justificatif") === true,
        });
      });

    // Ajouter les styles au survol
    $(".btn-verify").on("mouseenter", function () {
      $(this).css("background-color", "#059669");
      $(this).css("box-shadow", "0 2px 4px rgba(16, 185, 129, 0.3)");
    });
    $(".btn-verify").on("mouseleave", function () {
      $(this).css("background-color", "#10b981");
      $(this).css("box-shadow", "none");
    });

    $(".btn-reject").on("mouseenter", function () {
      $(this).css("background-color", "#dc2626");
      $(this).css("box-shadow", "0 2px 4px rgba(239, 68, 68, 0.3)");
    });
    $(".btn-reject").on("mouseleave", function () {
      $(this).css("background-color", "#ef4444");
      $(this).css("box-shadow", "none");
    });
  };

  const handleVerifyUser = async (userId, userName) => {
    setActionLoading(true);
    try {
      await axios.put(`/admin/utilisateurs/${userId}/verify`);
      toast.success(`${userName} a été vérifié avec succès`);
      // Recharger le DataTable
      if (datatableRef.current && typeof window.$ !== "undefined") {
        try {
          window.$(tableRef.current).DataTable().ajax.reload();
        } catch (e) {
          console.log("Error reloading DataTable");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      toast.error("Erreur lors de la vérification de l'utilisateur");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectUser = async (userId, userName) => {
    setActionLoading(true);
    try {
      await axios.put(`/admin/utilisateurs/${userId}/reject`);
      toast.success(`${userName} a été rejeté`);
      // Recharger le DataTable
      if (datatableRef.current && typeof window.$ !== "undefined") {
        try {
          window.$(tableRef.current).DataTable().ajax.reload();
        } catch (e) {
          console.log("Error reloading DataTable");
        }
      }
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      toast.error("Erreur lors du rejet de l'utilisateur");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Vérification des Utilisateurs</h1>
          <p className={styles.subtitle}>
            Vérifiez et validez les nouveaux utilisateurs non vérifiés
          </p>
        </div>

        <div className={styles.tableContainer}>
          <table ref={tableRef} className={`${styles.table} display`} style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Email vérifié</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Date d'enregistrement</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </main>

      {documentsUser && (
        <div className={styles.modalOverlay} onClick={() => setDocumentsUser(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Documents de {documentsUser.name}</h2>
              <p className={styles.modalSubtitle}>
                Consultez les pièces fournies avant de valider ou de rejeter le compte.
              </p>
            </div>

            <div className={styles.modalBody}>
              {[
                {
                  type: "identite",
                  label: "Pièce d'identité",
                  available: documentsUser.hasIdentite,
                },
                {
                  type: "justificatif",
                  label: "Justificatif de validité",
                  available: documentsUser.hasJustificatif,
                },
              ].map((doc) => (
                <div key={doc.type} className={styles.docItem}>
                  <span className={styles.docLabel}>{doc.label}</span>
                  {doc.available ? (
                    <button
                      className={styles.docLink}
                      onClick={() => openDocument(documentsUser.id, doc.type)}
                    >
                      Ouvrir le document
                    </button>
                  ) : (
                    <span className={styles.docMissing}>Non fourni</span>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnClose} onClick={() => setDocumentsUser(null)}>
                Fermer
              </button>
              <button
                className={styles.btnReject}
                disabled={actionLoading}
                onClick={() => {
                  handleRejectUser(documentsUser.id, documentsUser.name);
                  setDocumentsUser(null);
                }}
              >
                ✕ Rejeter
              </button>
              <button
                className={styles.btnVerify}
                disabled={actionLoading}
                onClick={() => {
                  handleVerifyUser(documentsUser.id, documentsUser.name);
                  setDocumentsUser(null);
                }}
              >
                ✓ Vérifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerification;
