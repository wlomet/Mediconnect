import { useEffect, useState } from "react";
import api from "../../../api/axios";

const COMMENTAIRE_MAX = 1000;

export default function ClientAntecedents() {
  const [categories, setCategories] = useState([]);
  const [saved, setSaved] = useState({ selected: [], commentaire: "" });
  const [draft, setDraft] = useState({ selected: [], commentaire: "" });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchAntecedents = async () => {
      try {
        const res = await api.get("/client/antecedents");
        setCategories(res.data.categories);
        const data = { selected: res.data.selected, commentaire: res.data.commentaire || "" };
        setSaved(data);
        setDraft(data);
      } catch (err) {
        console.error("Erreur lors du chargement des antécédents:", err);
        setMessage({ type: "error", text: "Erreur lors du chargement des antécédents" });
      } finally {
        setLoading(false);
      }
    };

    fetchAntecedents();
  }, []);

  // "Aucun" est exclusif au sein de sa catégorie
  const toggleOption = (categorie, option) => {
    setDraft((prev) => {
      const categoryOptions = categories.find((c) => c.categorie === categorie).options;
      const categoryIds = categoryOptions.map((o) => o.id);
      const aucunId = categoryOptions.find((o) => o.est_aucun)?.id;
      const isChecked = prev.selected.includes(option.id);

      let selected;
      if (isChecked) {
        selected = prev.selected.filter((id) => id !== option.id);
      } else if (option.est_aucun) {
        selected = [...prev.selected.filter((id) => !categoryIds.includes(id)), option.id];
      } else {
        selected = [...prev.selected.filter((id) => id !== aucunId), option.id];
      }

      return { ...prev, selected };
    });
  };

  const handleCancel = () => {
    setDraft(saved);
    setEditMode(false);
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await api.put("/client/antecedents", {
        options: draft.selected,
        commentaire: draft.commentaire.trim() || null,
      });
      setCategories(res.data.categories);
      const data = { selected: res.data.selected, commentaire: res.data.commentaire || "" };
      setSaved(data);
      setDraft(data);
      setEditMode(false);
      setMessage({ type: "success", text: "Antécédents mis à jour avec succès" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      const firstFieldError = err.response?.data?.errors
        ? Object.values(err.response.data.errors)[0]?.[0]
        : null;
      setMessage({
        type: "error",
        text:
          firstFieldError ||
          err.response?.data?.message ||
          "Erreur lors de la mise à jour des antécédents",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Antécédents médicaux</h2>
          <p className="text-sm text-gray-600 mt-1">
            Sélectionnez les options qui vous concernent
          </p>
        </div>
        {!loading && (
          <button
            type="button"
            onClick={() => (editMode ? handleCancel() : setEditMode(true))}
            className={`px-4 py-2 rounded-lg transition ${editMode
                ? "bg-gray-300 hover:bg-gray-400 text-gray-800"
                : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
          >
            {editMode ? "Annuler" : "Modifier"}
          </button>
        )}
      </div>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg border ${message.type === "success"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
            }`}
        >
          <p
            className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"
              }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Chargement des antécédents...</p>
      ) : editMode ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.categorie}>
              <p className="text-sm font-medium text-gray-700 mb-2">{cat.categorie}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.options.map((option) => {
                  const checked = draft.selected.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 px-4 py-2 border rounded-lg cursor-pointer transition ${checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(cat.categorie, option)}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-800">{option.libelle}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire / précisions
            </label>
            <textarea
              rows={4}
              maxLength={COMMENTAIRE_MAX}
              value={draft.commentaire}
              onChange={(e) => setDraft((prev) => ({ ...prev, commentaire: e.target.value }))}
              disabled={submitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            <p className="text-gray-500 text-xs mt-2 text-right">
              {draft.commentaire.length}/{COMMENTAIRE_MAX}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {submitting ? "Enregistrement..." : "Enregistrer les antécédents"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const chosen = cat.options
              .filter((o) => saved.selected.includes(o.id))
              .map((o) => o.libelle);
            return (
              <div key={cat.categorie}>
                <p className="text-sm text-gray-600">{cat.categorie}</p>
                <p className="text-lg font-medium text-gray-800">
                  {chosen.length > 0 ? chosen.join(", ") : "Non renseigné"}
                </p>
              </div>
            );
          })}

          <div>
            <p className="text-sm text-gray-600">Commentaire / précisions</p>
            <p className="text-lg font-medium text-gray-800 whitespace-pre-line">
              {saved.commentaire || "Non renseigné"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
