import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { fr } from "date-fns/locale/fr";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDateKey, parseDateKey } from "../utils/dateHelpers";
import styles from "./SelecteurPeriode.module.css";

const DUREES = [
  { valeur: "week-end", libelle: "Un week-end" },
  { valeur: "semaine", libelle: "Une semaine" },
  { valeur: "mois", libelle: "Un mois" },
];

const ONGLETS = [
  { valeur: "dates", libelle: "Dates" },
  { valeur: "flexibles", libelle: "Flexibles" },
];

const NOMBRE_CARTES = 6;
const REQUETE_DEUX_MOIS = "(min-width: 640px)";

const CLASSES_CALENDRIER = {
  root: styles.calendrier,
  months: styles.mois,
  month: styles.unMois,
  month_caption: styles.entete,
  button_previous: styles.flechePrecedente,
  button_next: styles.flecheSuivante,
  chevron: styles.chevron,
  weekday: styles.jourSemaine,
  month_grid: styles.grille,
  day: styles.cellule,
  day_button: styles.jour,
  selected: styles.selectionne,
  today: styles.aujourdhui,
  range_start: styles.debutPlage,
  range_middle: styles.intermediaire,
  range_end: styles.finPlage,
};

const debutDuMois = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const ajouterMois = (date, nombre) => new Date(date.getFullYear(), date.getMonth() + nombre, 1);

// Plage couverte par une carte mois : mois entier, 7 jours, ou premier week-end du mois
const plageDuMois = (mois, duree) => {
  const premier = debutDuMois(mois);
  if (duree === "mois") {
    return { debut: premier, fin: new Date(premier.getFullYear(), premier.getMonth() + 1, 0) };
  }
  if (duree === "semaine") {
    return { debut: premier, fin: addDays(premier, 6) };
  }
  const samedi = addDays(premier, 6 - premier.getDay());
  return { debut: samedi, fin: addDays(samedi, 1) };
};

const libelleDate = (cle) =>
  parseDateKey(cle).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const jourSemaine = (jour) => jour.toLocaleDateString("fr-FR", { weekday: "narrow" });

// Valeurs au format AAAA-MM-JJ ; une valeur vide signifie « aucune période »
export default function SelecteurPeriode({ label, from, to, onChange, couleur }) {
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState("dates");
  const [duree, setDuree] = useState("semaine");
  const [mois, setMois] = useState(() => debutDuMois(new Date()));
  const [brouillon, setBrouillon] = useState(null);
  const [deuxMois, setDeuxMois] = useState(() => window.matchMedia(REQUETE_DEUX_MOIS).matches);
  const racine = useRef(null);

  useEffect(() => {
    const media = window.matchMedia(REQUETE_DEUX_MOIS);
    const surChangement = (e) => setDeuxMois(e.matches);
    media.addEventListener("change", surChangement);
    return () => media.removeEventListener("change", surChangement);
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;

    const surClicExterne = (e) => {
      if (!racine.current?.contains(e.target)) {
        setOuvert(false);
        setBrouillon(null);
      }
    };
    const surEchap = (e) => {
      if (e.key === "Escape") {
        setOuvert(false);
        setBrouillon(null);
      }
    };
    document.addEventListener("mousedown", surClicExterne);
    document.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("mousedown", surClicExterne);
      document.removeEventListener("keydown", surEchap);
    };
  }, [ouvert]);

  const ouvrir = () => {
    setMois(debutDuMois(from ? parseDateKey(from) : new Date()));
    setOuvert(true);
  };

  const fermer = () => {
    setOuvert(false);
    setBrouillon(null);
  };

  // Premier clic = début, second clic = fin ; un clic avant le début repart de ce jour
  const choisirJour = (jour) => {
    const cle = formatDateKey(jour);
    if (!brouillon || cle < brouillon) {
      setBrouillon(cle);
      return;
    }
    onChange({ from: brouillon, to: cle });
    fermer();
  };

  const choisirMois = (debutMois) => {
    const { debut, fin } = plageDuMois(debutMois, duree);
    onChange({ from: formatDateKey(debut), to: formatDateKey(fin) });
    fermer();
  };

  const effacer = () => {
    onChange({ from: "", to: "" });
    setBrouillon(null);
  };

  const estChoisie = (debutMois) => {
    const { debut, fin } = plageDuMois(debutMois, duree);
    return formatDateKey(debut) === from && formatDateKey(fin) === to;
  };

  const selection = brouillon
    ? { from: parseDateKey(brouillon), to: undefined }
    : { from: from ? parseDateKey(from) : undefined, to: to ? parseDateKey(to) : undefined };

  const valeur = from && to ? `${libelleDate(from)} – ${libelleDate(to)}` : "";
  const cartesMois = Array.from({ length: NOMBRE_CARTES }, (_, index) => ajouterMois(mois, index));

  return (
    <div className={styles.racine} ref={racine} style={couleur ? { "--couleur-selection": couleur } : undefined}>
      <span className={styles.legende}>{label}</span>
      <button
        type="button"
        className={styles.declencheur}
        aria-label={label}
        aria-expanded={ouvert}
        onClick={ouvert ? fermer : ouvrir}
      >
        <span className={valeur ? styles.valeur : styles.vide}>{valeur || "Choisir une période"}</span>
        <Calendar size={16} aria-hidden="true" />
      </button>

      {ouvert && (
        <div className={styles.panneau} role="dialog" aria-label={label}>
          <div className={styles.onglets} role="tablist">
            {ONGLETS.map((o) => (
              <button
                key={o.valeur}
                type="button"
                role="tab"
                aria-selected={onglet === o.valeur}
                className={onglet === o.valeur ? styles.ongletActif : styles.onglet}
                onClick={() => setOnglet(o.valeur)}
              >
                {o.libelle}
              </button>
            ))}
          </div>

          {onglet === "dates" ? (
            <DayPicker
              mode="range"
              locale={fr}
              numberOfMonths={deuxMois ? 2 : 1}
              month={mois}
              onMonthChange={setMois}
              selected={selection}
              onDayClick={choisirJour}
              showOutsideDays={false}
              formatters={{ formatWeekdayName: jourSemaine }}
              classNames={CLASSES_CALENDRIER}
            />
          ) : (
            <div className={styles.flexibles}>
              <p className={styles.titreSection}>Quelle durée ?</p>
              <div className={styles.durees}>
                {DUREES.map((d) => (
                  <button
                    key={d.valeur}
                    type="button"
                    aria-pressed={duree === d.valeur}
                    className={duree === d.valeur ? styles.dureeActive : styles.duree}
                    onClick={() => setDuree(d.valeur)}
                  >
                    {d.libelle}
                  </button>
                ))}
              </div>

              <p className={styles.titreSection}>Quel mois ?</p>
              <div className={styles.cartes}>
                <button
                  type="button"
                  className={styles.navCartes}
                  aria-label="Mois précédents"
                  onClick={() => setMois(ajouterMois(mois, -NOMBRE_CARTES))}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                {cartesMois.map((debutMois) => (
                  <button
                    key={formatDateKey(debutMois)}
                    type="button"
                    className={estChoisie(debutMois) ? styles.carteActive : styles.carte}
                    onClick={() => choisirMois(debutMois)}
                  >
                    <Calendar size={28} strokeWidth={1.5} aria-hidden="true" />
                    <span className={styles.nomMois}>
                      {debutMois.toLocaleDateString("fr-FR", { month: "long" })}
                    </span>
                    <span className={styles.annee}>{debutMois.getFullYear()}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={styles.navCartes}
                  aria-label="Mois suivants"
                  onClick={() => setMois(ajouterMois(mois, NOMBRE_CARTES))}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div className={styles.pied}>
            <button type="button" className={styles.effacer} onClick={effacer}>
              Effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
