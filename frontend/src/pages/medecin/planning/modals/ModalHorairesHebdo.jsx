import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/axios";

export default function ModalHorairesHebdo({ onClose, onUpdate }) {
  const [horaires, setHoraires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const creneaux = ["matin", "apres_midi"];

  // Charger les horaires existants
  useEffect(() => {
    const fetchHoraires = async () => {
      try {
        const res = await api.get("/medecin/horaires");
        setHoraires(res.data);
      } catch (err) {
        console.error("Erreur lors du chargement des horaires :", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHoraires();
  }, []);

  // Trouver un horaire spécifique
  const getHoraire = (jour, creneau) => {
    return horaires.find((h) => h.jour === jour && h.creneau === creneau);
  };

  // Mettre à jour un horaire localement
  const updateHoraire = (jour, creneau, field, value) => {
    setHoraires((prev) => {
      const existing = prev.find((h) => h.jour === jour && h.creneau === creneau);

      if (existing) {
        return prev.map((h) =>
          h.jour === jour && h.creneau === creneau ? { ...h, [field]: value } : h
        );
      } else {
        // Créer un nouvel horaire
        const defaultHeures =
          creneau === "matin"
            ? { heure_debut: "08:30", heure_fin: "12:30" }
            : { heure_debut: "13:30", heure_fin: "17:00" };

        return [
          ...prev,
          {
            jour,
            creneau,
            ...defaultHeures,
            actif: true,
            [field]: value,
          },
        ];
      }
    });
  };

  // Toggle actif/inactif
  const toggleActif = (jour, creneau) => {
    const horaire = getHoraire(jour, creneau);
    const newActif = horaire ? !horaire.actif : true;
    updateHoraire(jour, creneau, "actif", newActif);
  };

  // Appliquer à toute la semaine
  const appliquerATous = (creneau) => {
    const premierJour = horaires.find((h) => h.creneau === creneau && h.actif);
    if (!premierJour) return;

    jours.forEach((jour) => {
      updateHoraire(jour, creneau, "heure_debut", premierJour.heure_debut);
      updateHoraire(jour, creneau, "heure_fin", premierJour.heure_fin);
      updateHoraire(jour, creneau, "actif", true);
    });
  };

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/medecin/horaires", { horaires });
      toast.success("Horaires mis à jour avec succès !");
      onClose();
      onUpdate();
    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Gérer mes horaires hebdomadaires</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Section Matin */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">🌅 Créneaux du matin</h3>
              <button
                onClick={() => appliquerATous("matin")}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
              >
                Appliquer à tous
              </button>
            </div>

            <div className="space-y-2">
              {jours.map((jour) => {
                const horaire = getHoraire(jour, "matin");
                return (
                  <div
                    key={`${jour}-matin`}
                    className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center gap-2 md:gap-3 md:flex-1">
                      <input
                        type="checkbox"
                        checked={horaire?.actif ?? false}
                        onChange={() => toggleActif(jour, "matin")}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="w-24 font-medium capitalize">{jour}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-1">
                      <input
                        type="time"
                        value={horaire?.heure_debut ?? "08:30"}
                        onChange={(e) => updateHoraire(jour, "matin", "heure_debut", e.target.value)}
                        disabled={!horaire?.actif}
                        className="border rounded px-2 py-1 disabled:bg-gray-200 disabled:cursor-not-allowed flex-1 md:flex-none"
                      />
                      <span className="hidden md:inline">-</span>
                      <input
                        type="time"
                        value={horaire?.heure_fin ?? "12:30"}
                        onChange={(e) => updateHoraire(jour, "matin", "heure_fin", e.target.value)}
                        disabled={!horaire?.actif}
                        className="border rounded px-2 py-1 disabled:bg-gray-200 disabled:cursor-not-allowed flex-1 md:flex-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Après-midi */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">🌞 Créneaux de l'après-midi</h3>
              <button
                onClick={() => appliquerATous("apres_midi")}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
              >
                Appliquer à tous
              </button>
            </div>

            <div className="space-y-2">
              {jours.map((jour) => {
                const horaire = getHoraire(jour, "apres_midi");
                return (
                  <div
                    key={`${jour}-apres_midi`}
                    className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center gap-2 md:gap-3 md:flex-1">
                      <input
                        type="checkbox"
                        checked={horaire?.actif ?? false}
                        onChange={() => toggleActif(jour, "apres_midi")}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <span className="w-24 font-medium capitalize">{jour}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-1">
                      <input
                        type="time"
                        value={horaire?.heure_debut ?? "13:30"}
                        onChange={(e) =>
                          updateHoraire(jour, "apres_midi", "heure_debut", e.target.value)
                        }
                        disabled={!horaire?.actif}
                        className="border rounded px-2 py-1 disabled:bg-gray-200 disabled:cursor-not-allowed flex-1 md:flex-none"
                      />
                      <span className="hidden md:inline">-</span>
                      <input
                        type="time"
                        value={horaire?.heure_fin ?? "17:00"}
                        onChange={(e) =>
                          updateHoraire(jour, "apres_midi", "heure_fin", e.target.value)
                        }
                        disabled={!horaire?.actif}
                        className="border rounded px-2 py-1 disabled:bg-gray-200 disabled:cursor-not-allowed flex-1 md:flex-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
            💡 <strong>Astuce :</strong> Cochez la case pour activer un créneau, puis définissez les
            heures. Utilisez "Appliquer à tous" pour copier les horaires sur toute la semaine.
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
