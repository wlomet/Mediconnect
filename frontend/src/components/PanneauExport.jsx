import { useState } from "react";
import { toast } from "react-toastify";
import { bornesPresetPeriode, formatDateKey } from "../utils/dateHelpers";
import { FORMATS_EXPORT } from "../utils/exportTableau";

const PRESETS_PERIODE = [
  { valeur: "jour", libelle: "Aujourd'hui" },
  { valeur: "semaine", libelle: "Semaine en cours" },
  { valeur: "mois", libelle: "Mois en cours" },
];

// onExporter reçoit { format, from, to } (dates incluses, AAAA-MM-JJ) et rejette en cas d'échec
export default function PanneauExport({ onExporter, couleur = "#0596DE" }) {
  const [format, setFormat] = useState("csv");
  const [from, setFrom] = useState(() => formatDateKey(new Date()));
  const [to, setTo] = useState(() => formatDateKey(new Date()));
  const [preset, setPreset] = useState(null);

  const choisirPreset = (valeur) => {
    const { debut, fin } = bornesPresetPeriode(valeur);
    setPreset(valeur);
    setFrom(formatDateKey(debut));
    setTo(formatDateKey(fin));
  };

  // Modifier une date à la main désélectionne le raccourci
  const modifierDate = (setter) => (e) => {
    setPreset(null);
    setter(e.target.value);
  };

  const inverse = Boolean(from && to && from > to);
  const invalide = !from || !to || inverse;

  const telecharger = async () => {
    try {
      await onExporter({ format, from, to });
    } catch {
      toast.error("Export impossible");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
          Du
          <input
            type="date"
            value={from}
            onChange={modifierDate(setFrom)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
          Au
          <input
            type="date"
            value={to}
            onChange={modifierDate(setTo)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>
        {PRESETS_PERIODE.map((p) => (
          <button
            key={p.valeur}
            type="button"
            onClick={() => choisirPreset(p.valeur)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              preset === p.valeur
                ? "text-white"
                : "border-gray-200 bg-white text-[#0A1E3D] hover:bg-gray-50"
            }`}
            style={preset === p.valeur ? { borderColor: couleur, backgroundColor: couleur } : undefined}
          >
            {p.libelle}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-[#0A1E3D]">
          Format
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            {FORMATS_EXPORT.map((f) => (
              <option key={f.valeur} value={f.valeur}>
                {f.libelle}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={telecharger}
          disabled={invalide}
          className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          Télécharger
        </button>
        {inverse && <p className="text-xs text-red-600">La date de début doit précéder la date de fin.</p>}
      </div>
    </div>
  );
}
