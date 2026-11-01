import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axios";
import { toast } from "react-toastify";
import EtablissementsDataTable from "./tables/EtablissementsDataTable";
import HopitalMedecinsModal from "./modals/HopitalMedecinsModal";
import styles from "../dashboard/DashboardSuperAdmin.module.css";

const EtablissementsSuperAdmin = () => {
  const navigate = useNavigate();
  const [hopitaux, setHopitaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHopitalId, setSelectedHopitalId] = useState(null);

  const fetchHopitaux = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/super-admin/etablissements");
      setHopitaux(res.data.hopitaux || []);
    } catch (error) {
      console.error("Erreur:", error);
      if (error.response?.status === 403) {
        toast.error("Accès refusé - Réservé aux Super Admins");
        navigate("/login");
      } else {
        toast.error("Erreur lors du chargement des établissements");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchHopitaux();
  }, [fetchHopitaux]);

  const selectedHopital = hopitaux.find((h) => String(h.id) === String(selectedHopitalId));

  if (loading) {
    return <div className={styles.loading}>Chargement...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏥 Établissements</h1>
      </div>

      <div className={styles.section}>
        <h2 style={{ marginTop: 0 }}>Tous les établissements</h2>
        <p style={{ color: "#666", marginTop: "-8px" }}>
          Masquer un établissement le retire des pages publiques et masque automatiquement tous ses
          médecins. Personne ne peut prendre rendez-vous avec un médecin masqué.
        </p>
        <EtablissementsDataTable
          hopitaux={hopitaux}
          onOpenMedecins={(id) => setSelectedHopitalId(id)}
        />
      </div>

      {selectedHopitalId && selectedHopital && (
        <HopitalMedecinsModal
          hopitalId={selectedHopitalId}
          hopitalName={selectedHopital.name}
          onClose={() => setSelectedHopitalId(null)}
          onChanged={fetchHopitaux}
        />
      )}
    </div>
  );
};

export default EtablissementsSuperAdmin;
