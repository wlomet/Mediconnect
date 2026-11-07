import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { formatDateKey, libellePeriode } from "../../../utils/dateHelpers";
import { exporterSvgEnPng } from "../../../utils/exportImage";
import GraphiqueBarres from "./GraphiqueBarres";
import GraphiqueCourbes from "./GraphiqueCourbes";
import styles from "./StatistiquesGestionnaire.module.css";

// Par défaut : les 12 derniers mois, mois en cours inclus
const periodeParDefaut = () => {
  const aujourdhui = new Date();
  return {
    from: formatDateKey(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 11, 1)),
    to: formatDateKey(aujourdhui),
  };
};

const formatNombre = (valeur) => Number(valeur).toLocaleString("fr-FR");

export default function GraphiqueStatistique({
  titre,
  nomFichier,
  charger,
  medecinId,
  type,
  unite,
  series,
  formaterValeur = formatNombre,
  resume,
}) {
  const [periode, setPeriode] = useState(periodeParDefaut);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const svgRef = useRef(null);

  const { from, to } = periode;
  const invalide = !from || !to || from > to;

  useEffect(() => {
    if (invalide) return undefined;

    let actif = true;
    setChargement(true);

    charger({ from, to, medecinId })
      .then((reponse) => {
        if (!actif) return;
        setDonnees(reponse);
        setErreur("");
      })
      .catch(() => {
        if (!actif) return;
        setDonnees(null);
        setErreur("Impossible de charger ce graphique.");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });

    return () => {
      actif = false;
    };
  }, [charger, from, to, medecinId, invalide]);

  const modifierDate = (cle) => (e) => {
    const valeur = e.target.value;
    setPeriode((courante) => ({ ...courante, [cle]: valeur }));
  };

  const exporter = async () => {
    try {
      await exporterSvgEnPng({
        svg: svgRef.current,
        titre,
        sousTitre: libellePeriode(from, to),
        nomFichier: `${nomFichier}_${from}_${to}`,
      });
    } catch {
      toast.error("Export de l'image impossible");
    }
  };

  const afficherGraphique = !invalide && !erreur && donnees;

  return (
    <section className={styles.carte}>
      <header className={styles.enteteCarte}>
        <div>
          <h2 className={styles.titreCarte}>{titre}</h2>
          {afficherGraphique && resume && <p className={styles.resume}>{resume(donnees)}</p>}
        </div>
        <button
          type="button"
          className={styles.boutonSecondaire}
          onClick={exporter}
          disabled={!afficherGraphique || chargement}
        >
          Exporter en PNG
        </button>
      </header>

      <div className={styles.periode}>
        <label className={styles.champ}>
          Du
          <input type="date" value={from} onChange={modifierDate("from")} className={styles.input} />
        </label>
        <label className={styles.champ}>
          Au
          <input type="date" value={to} onChange={modifierDate("to")} className={styles.input} />
        </label>
      </div>

      {!from || !to ? (
        <p className={styles.erreur}>Renseignez les deux dates.</p>
      ) : from > to ? (
        <p className={styles.erreur}>La date de début doit précéder la date de fin.</p>
      ) : null}

      {erreur && <p className={styles.erreur}>{erreur}</p>}

      {!invalide && !erreur &&
        (donnees ? (
          <div className={`${styles.zoneGraphique} ${chargement ? styles.enChargement : ""}`}>
            {type === "courbes" ? (
              <GraphiqueCourbes
                svgRef={svgRef}
                points={donnees.points}
                granularite={donnees.granularite}
                series={series}
                unite={unite}
                formaterValeur={formaterValeur}
              />
            ) : (
              <GraphiqueBarres
                svgRef={svgRef}
                points={donnees.points}
                granularite={donnees.granularite}
                series={series}
                unite={unite}
                formaterValeur={formaterValeur}
              />
            )}
          </div>
        ) : (
          <p className={styles.vide}>Chargement du graphique...</p>
        ))}
    </section>
  );
}
