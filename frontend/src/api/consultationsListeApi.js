import api from "./axios";
import { telechargerCsv } from "../utils/csvExport";
import { telechargerTableau } from "../utils/exportTableau";
import { libellePeriode, paramsPeriode } from "../utils/dateHelpers";

// Export des consultations d'un rôle (racine "/directeur" ou "/gestionnaire"), avec les filtres du tableau
export const exporterConsultations = (racine, { format, from, to, statut, medecinId }) => {
  const params = {
    ...paramsPeriode({ from, to }),
    ...(statut ? { statut } : {}),
    ...(medecinId ? { medecin_id: medecinId } : {}),
  };
  const url = `${racine}/consultations/export`;

  if (format === "csv") {
    return api.get(url, { params, responseType: "blob" }).then(telechargerCsv);
  }

  return api.get(url, { params: { ...params, format: "json" } }).then((res) =>
    telechargerTableau({
      format,
      nomBase: res.data.nom_base,
      titre: `Consultations ${libellePeriode(from, to)}`,
      entetes: res.data.entetes,
      lignes: res.data.lignes,
    })
  );
};
