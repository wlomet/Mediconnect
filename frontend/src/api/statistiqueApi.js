import api from "./axios";
import { paramsPeriode } from "../utils/dateHelpers";

const base = "/medecin/statistiques";

// Chaque graphique interroge son propre endpoint avec sa propre période { from, to }
const charger = (chemin) => (periode) =>
  api.get(`${base}/${chemin}`, { params: paramsPeriode(periode) }).then((res) => res.data);

export const statistiqueApi = {
  rendezVous: charger("rendez-vous"),
  consultations: charger("consultations"),
  documents: charger("documents"),
  factures: charger("factures"),
};
