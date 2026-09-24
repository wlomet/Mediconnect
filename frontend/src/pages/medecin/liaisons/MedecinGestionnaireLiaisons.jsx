import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axios";
import ConfirmDialog from "../../../components/ConfirmDialog";
import "./MedecinGestionnaireLiaisons.css";

function MedecinGestionnaireLiaisons() {
  const [activeTab, setActiveTab] = useState("demandes");
  const [demandes, setDemandes] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false });

  const closeConfirmDialog = () => setConfirmDialog({ open: false });

  useEffect(() => {
    fetchDemandes();
    fetchHistorique();
  }, []);

  const fetchDemandes = async () => {
    try {
      const response = await axiosInstance.get("/medecin/liaisons-gestionnaires/demandes");
      setDemandes(response.data.demandes || []);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des demandes:", error);
      setError("Erreur lors du chargement des demandes");
      setLoading(false);
    }
  };

  const fetchHistorique = async () => {
    try {
      const response = await axiosInstance.get("/medecin/liaisons-gestionnaires");
      setHistorique(response.data.liaisons || []);
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
    }
  };

  const handleAccept = async (id) => {
    try {
      await axiosInstance.patch(`/medecin/liaisons-gestionnaires/${id}/accepter`);
      fetchDemandes();
      fetchHistorique();
    } catch (error) {
      console.error("Erreur lors de l'acceptation:", error);
      setError("Erreur lors de l'acceptation de la demande");
    }
  };

  const handleRefuse = async (id) => {
    try {
      await axiosInstance.patch(`/medecin/liaisons-gestionnaires/${id}/refuser`);
      fetchDemandes();
      fetchHistorique();
    } catch (error) {
      console.error("Erreur lors du refus:", error);
      setError("Erreur lors du refus de la demande");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer la liaison",
      message: "Êtes-vous sûr de vouloir supprimer cette liaison ?",
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: () => confirmDelete(id),
    });
  };

  const confirmDelete = async (id) => {
    closeConfirmDialog();

    try {
      await axiosInstance.delete(`/medecin/liaisons-gestionnaires/${id}`);
      fetchHistorique();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setError("Erreur lors de la suppression de la liaison");
    }
  };

  const getStatusBadge = (statut) => {
    const badges = {
      en_attente: { class: "badge-warning", text: "En attente" },
      acceptee: { class: "badge-success", text: "Acceptée" },
      refusee: { class: "badge-danger", text: "Refusée" },
    };
    const badge = badges[statut] || { class: "", text: statut };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className="medecin-gestionnaire-liaisons">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="medecin-gestionnaire-liaisons">
      <div className="liaisons-header">
        <h1>Liaisons Gestionnaires</h1>
        <p>Gérez vos demandes de liaison avec les gestionnaires</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "demandes" ? "active" : ""}`}
          onClick={() => setActiveTab("demandes")}
        >
          Demandes en attente
          {demandes.length > 0 && <span className="notification-badge">{demandes.length}</span>}
        </button>
        <button
          className={`tab ${activeTab === "historique" ? "active" : ""}`}
          onClick={() => setActiveTab("historique")}
        >
          Historique
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "demandes" && (
          <div className="demandes-list">
            {demandes.length === 0 ? (
              <div className="no-data">Aucune demande en attente</div>
            ) : (
              <div className="liaisons-grid">
                {demandes.map((demande) => (
                  <div key={demande.id} className="liaison-card pending">
                    <div className="liaison-header">
                      <div>
                        <h3>{demande.gestionnaire?.name}</h3>
                        <p className="gestionnaire-email">{demande.gestionnaire?.email}</p>
                      </div>
                      {getStatusBadge(demande.statut)}
                    </div>
                    <div className="liaison-content">
                      <div className="info-row">
                        <span className="label">Date demande:</span>
                        <span>{new Date(demande.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {demande.message && (
                        <div className="info-row">
                          <span className="label">Message:</span>
                          <span className="message-text">{demande.message}</span>
                        </div>
                      )}
                    </div>
                    <div className="liaison-actions">
                      <button onClick={() => handleAccept(demande.id)} className="btn-accept">
                        Accepter
                      </button>
                      <button onClick={() => handleRefuse(demande.id)} className="btn-refuse">
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "historique" && (
          <div className="historique-list">
            {historique.length === 0 ? (
              <div className="no-data">Aucun historique</div>
            ) : (
              <div className="liaisons-grid">
                {historique.map((liaison) => (
                  <div key={liaison.id} className="liaison-card">
                    <div className="liaison-header">
                      <div>
                        <h3>{liaison.gestionnaire?.name}</h3>
                        <p className="gestionnaire-email">{liaison.gestionnaire?.email}</p>
                      </div>
                      {getStatusBadge(liaison.statut)}
                    </div>
                    <div className="liaison-content">
                      <div className="info-row">
                        <span className="label">Date demande:</span>
                        <span>{new Date(liaison.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {liaison.message && (
                        <div className="info-row">
                          <span className="label">Message:</span>
                          <span className="message-text">{liaison.message}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Dernière mise à jour:</span>
                        <span>{new Date(liaison.updated_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                    {liaison.statut === "acceptee" && (
                      <div className="liaison-actions">
                        <button onClick={() => handleDelete(liaison.id)} className="btn-delete">
                          Supprimer la liaison
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}

export default MedecinGestionnaireLiaisons;
