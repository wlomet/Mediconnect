import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axios";
import ConfirmDialog from "../../../components/ConfirmDialog";
import "./MedecinLiaisons.css";

function MedecinLiaisons() {
  const [demandes, setDemandes] = useState([]);
  const [liaisons, setLiaisons] = useState([]);
  const [activeTab, setActiveTab] = useState("demandes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });

  const closeConfirmDialog = () => setConfirmDialog({ open: false });

  useEffect(() => {
    fetchDemandes();
    fetchLiaisons();
  }, []);

  const fetchDemandes = async () => {
    try {
      const response = await axiosInstance.get("/medecin/liaisons-secretaire/demandes");
      setDemandes(response.data.demandes || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des demandes:", err);
    }
  };

  const fetchLiaisons = async () => {
    try {
      const response = await axiosInstance.get("/medecin/liaisons-secretaire");
      setLiaisons(response.data.secretaires || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des liaisons:", err);
    }
  };

  const handleAccept = async (id) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axiosInstance.patch(`/medecin/liaisons-secretaire/${id}/accepter`);
      setSuccess(response.data.message);
      fetchDemandes();
      fetchLiaisons();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'acceptation");
    } finally {
      setLoading(false);
    }
  };

  const handleRefuse = async (id) => {
    setConfirmDialog({
      open: true,
      title: "Refuser la demande",
      message: "Voulez-vous vraiment refuser cette demande ?",
      confirmLabel: "Refuser",
      variant: "danger",
      onConfirm: () => confirmRefuse(id),
    });
  };

  const confirmRefuse = async (id) => {
    closeConfirmDialog();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axiosInstance.patch(`/medecin/liaisons-secretaire/${id}/refuser`);
      setSuccess(response.data.message);
      fetchDemandes();
      fetchLiaisons();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du refus");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      open: true,
      title: "Supprimer la liaison",
      message: "Voulez-vous vraiment supprimer cette liaison ?",
      confirmLabel: "Supprimer",
      variant: "danger",
      onConfirm: () => confirmDelete(id),
    });
  };

  const confirmDelete = async (id) => {
    closeConfirmDialog();
    try {
      await axiosInstance.delete(`/medecin/liaisons-secretaire/${id}`);
      setSuccess("Liaison supprimée avec succès");
      fetchLiaisons();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  const handleCreateSecretaire = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setFormError("Tous les champs sont obligatoires");
      setFormLoading(false);
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setFormError("Les mots de passe ne correspondent pas");
      setFormLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post("/medecin/secretaires/create", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });

      setSuccess(response.data.message);
      setFormData({ name: "", email: "", password: "", password_confirmation: "" });
      setShowCreateModal(false);
      fetchLiaisons();
    } catch (err) {
      setFormError(err.response?.data?.message || "Erreur lors de la création du compte");
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_attente: { label: "En attente", class: "badge-warning" },
      accepte: { label: "Accepté", class: "badge-success" },
      refuse: { label: "Refusé", class: "badge-danger" },
    };
    const badge = badges[statut] || badges.en_attente;
    return <span className={`badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="medecin-liaisons">
      <div className="liaisons-header">
        <h1>Mes Secrétaires</h1>
        <p>Gérez vos secrétaires et demandes de liaison</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tabs avec bouton de création */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "demandes" ? "active" : ""}`}
            onClick={() => setActiveTab("demandes")}
          >
            Nouvelles Demandes
            {demandes.length > 0 && <span className="badge-count">{demandes.length}</span>}
          </button>
          <button
            className={`tab ${activeTab === "historique" ? "active" : ""}`}
            onClick={() => setActiveTab("historique")}
          >
            Historique
          </button>
        </div>
        <button className="btn-create-secretaire" onClick={() => setShowCreateModal(true)}>
          + Créer un secrétaire
        </button>
      </div>

      {/* Contenu des tabs */}
      <div className="tab-content">
        {activeTab === "demandes" && (
          <div className="demandes-section">
            {demandes.length === 0 ? (
              <p className="no-data">Aucune nouvelle demande de liaison</p>
            ) : (
              <div className="liaisons-grid">
                {demandes.map((demande) => (
                  <div key={demande.id} className="liaison-card pending">
                    <div className="liaison-header">
                      <div>
                        <h3>{demande.secretaire.name}</h3>
                        <p className="secretaire-email">{demande.secretaire.email}</p>
                      </div>
                      {getStatutBadge("en_attente")}
                    </div>

                    <div className="liaison-content">
                      {demande.message && (
                        <div className="message-box">
                          <p className="message-label">Message:</p>
                          <p className="message-text">{demande.message}</p>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Date de demande:</span>
                        <span>{new Date(demande.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>

                    <div className="liaison-actions">
                      <button
                        onClick={() => handleAccept(demande.id)}
                        className="btn-accept"
                        disabled={loading}
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRefuse(demande.id)}
                        className="btn-refuse"
                        disabled={loading}
                      >
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
          <div className="historique-section">
            {liaisons.length === 0 ? (
              <p className="no-data">Aucune liaison dans l'historique</p>
            ) : (
              <div className="liaisons-grid">
                {liaisons.map((liaison) => (
                  <div key={liaison.id} className="liaison-card">
                    <div className="liaison-header">
                      <div>
                        <h3>{liaison.name}</h3>
                        <p className="secretaire-email">{liaison.email}</p>
                      </div>
                      {getStatutBadge("accepte")}
                    </div>

                    <div className="liaison-content">
                      <div className="info-row">
                        <span className="label">Date de liaison:</span>
                        <span>{new Date(liaison.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>

                    <div className="liaison-actions">
                      <button onClick={() => handleDelete(liaison.id)} className="btn-delete">
                        Supprimer la liaison
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de création de secrétaire */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Créer un nouveau secrétaire</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleCreateSecretaire} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Nom complet *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Ex: Marie Dupont"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Ex: marie@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Mot de passe *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="Entrez un mot de passe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password_confirmation">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  id="password_confirmation"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleFormChange}
                  placeholder="Confirmez le mot de passe"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formLoading}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-create" disabled={formLoading}>
                  {formLoading ? "Création..." : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default MedecinLiaisons;
