import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../../../api/axios";
import styles from "./SelecteurCreneau.module.css";

const DUREE_CRENEAU_MS = 30 * 60 * 1000;
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const formatDateKey = (date) => {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
};

const formatHeure = (date) => date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const nomPatient = (rdv) => rdv.name || rdv.client?.name || "un autre patient";

const genererCreneaux = ({ dateKey, horaires, indisponibilites, rendezVous, rendezVousId }) => {
  const indisponible = indisponibilites.some(
    (i) => dateKey >= i.date_debut.slice(0, 10) && dateKey <= i.date_fin.slice(0, 10)
  );
  if (indisponible) {
    return [];
  }

  const numeroJour = new Date(`${dateKey}T00:00:00`).getDay();
  const maintenant = new Date();
  const occupants = rendezVous
    .filter((rdv) => rdv.id !== rendezVousId && (rdv.statut === "en_attente" || rdv.statut === "confirmé"))
    .map((rdv) => ({ rdv, debut: new Date(rdv.date_debut), fin: new Date(rdv.date_fin) }));

  const creneaux = [];
  horaires
    .filter((h) => h.actif && JOURS.indexOf(h.jour.toLowerCase()) === numeroJour)
    .forEach((h) => {
      const finPlage = new Date(`${dateKey}T${h.heure_fin}`);
      let debut = new Date(`${dateKey}T${h.heure_debut}`);

      while (debut.getTime() + DUREE_CRENEAU_MS <= finPlage.getTime()) {
        const fin = new Date(debut.getTime() + DUREE_CRENEAU_MS);
        if (fin > maintenant) {
          const conflit = occupants.find((o) => debut < o.fin && fin > o.debut);
          creneaux.push({ debut, fin, occupePar: conflit ? nomPatient(conflit.rdv) : null });
        }
        debut = fin;
      }
    });

  return creneaux.sort((a, b) => a.debut - b.debut);
};

const SelecteurCreneau = ({ medecinId, rendezVousId, creneauActuel, creneauChoisi, onChoisir, onFermer }) => {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [planning, setPlanning] = useState({ horaires: [], indisponibilites: [], rendezVous: [] });
  const [dateChoisie, setDateChoisie] = useState(() => {
    const maintenant = new Date();
    return formatDateKey(creneauActuel.start > maintenant ? creneauActuel.start : maintenant);
  });
  const dateMinimale = formatDateKey(new Date());

  useEffect(() => {
    const chargerPlanning = async () => {
      try {
        setChargement(true);
        const response = await axiosInstance.get(`/secretaire/medecins/${medecinId}/planning`);
        setPlanning({
          horaires: response.data.horaires || [],
          indisponibilites: response.data.indisponibilites || [],
          rendezVous: response.data.rendez_vous || [],
        });
        setErreur("");
      } catch (error) {
        console.error("Erreur lors du chargement du planning:", error);
        setErreur("Impossible de charger le planning du médecin.");
      } finally {
        setChargement(false);
      }
    };

    chargerPlanning();
  }, [medecinId]);

  const creneaux = useMemo(
    () => genererCreneaux({ dateKey: dateChoisie, ...planning, rendezVousId }),
    [dateChoisie, planning, rendezVousId]
  );

  const estMemeDebut = (a, b) => Boolean(a && b && a.getTime() === b.getTime());

  return (
    <div className={styles.selecteur}>
      <div className={styles.entete}>
        <label className={styles.label} htmlFor="selecteur-creneau-jour">
          Jour
        </label>
        <input
          id="selecteur-creneau-jour"
          type="date"
          min={dateMinimale}
          value={dateChoisie}
          onChange={(event) => setDateChoisie(event.target.value)}
          className={styles.inputDate}
        />
      </div>

      {chargement && <p className={styles.message}>Chargement du planning...</p>}
      {!chargement && erreur && <p className={styles.erreur}>{erreur}</p>}
      {!chargement && !erreur && creneaux.length === 0 && (
        <p className={styles.message}>Aucun créneau de consultation disponible ce jour.</p>
      )}

      {!chargement && !erreur && creneaux.length > 0 && (
        <div className={styles.grille}>
          {creneaux.map((creneau) => {
            const estActuel = estMemeDebut(creneau.debut, creneauActuel.start);
            const estChoisi = estMemeDebut(creneau.debut, creneauChoisi?.start);
            const classes = [
              styles.creneau,
              creneau.occupePar ? styles.occupe : styles.libre,
              estChoisi ? styles.choisi : "",
            ].join(" ");

            return (
              <button
                key={creneau.debut.getTime()}
                type="button"
                className={classes}
                title={creneau.occupePar ? `Occupé : ${creneau.occupePar}` : "Libre"}
                onClick={() =>
                  onChoisir({ start: creneau.debut, end: creneau.fin, occupe: Boolean(creneau.occupePar) })
                }
              >
                {formatHeure(creneau.debut)}
                {estActuel && <span className={styles.badge}>actuel</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.pied}>
        <span className={styles.legende}>
          <i className={`${styles.pastille} ${styles.pastilleLibre}`} /> Libre
        </span>
        <span className={styles.legende}>
          <i className={`${styles.pastille} ${styles.pastilleOccupe}`} /> Occupé
        </span>
        <span className={styles.legende}>
          <i className={`${styles.pastille} ${styles.pastilleChoisi}`} /> Choisi
        </span>
        <button type="button" className={styles.fermer} onClick={onFermer}>
          Fermer le planning
        </button>
      </div>
    </div>
  );
};

export default SelecteurCreneau;
