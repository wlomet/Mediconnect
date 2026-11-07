import { echelleMaximale, libelleDebut, pasEntreLibelles, valeursGraduations } from "./graphiqueUtils";

const LARGEUR = 560;
const HAUTEUR = 320;
const MARGES = { haut: 44, droite: 12, bas: 48, gauche: 52 };
const MAX_VALEURS_AFFICHEES = 12;

// Graphique SVG : les styles sont en attributs pour rester fidèles à l'export PNG
export default function GraphiqueBarres({ svgRef, points, granularite, series, unite, formaterValeur }) {
  const [serie] = series;
  const barres = points.map((point) => ({
    libelle: libelleDebut(point.debut, granularite),
    valeur: point[serie.cle],
    couleur: serie.couleur,
  }));
  const zoneLargeur = LARGEUR - MARGES.gauche - MARGES.droite;
  const zoneHauteur = HAUTEUR - MARGES.haut - MARGES.bas;
  const ligneBase = MARGES.haut + zoneHauteur;
  const echelle = echelleMaximale(Math.max(0, ...barres.map((barre) => barre.valeur)));
  const largeurCase = zoneLargeur / Math.max(barres.length, 1);
  const largeurBarre = Math.min(72, largeurCase * 0.6);
  const saut = pasEntreLibelles(barres.length);
  const afficherValeurs = barres.length <= MAX_VALEURS_AFFICHEES;
  const tailleValeur = barres.length > 6 ? 11 : 13;
  const yPour = (valeur) => ligneBase - (valeur / echelle) * zoneHauteur;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      width="100%"
      fontFamily="Arial, Helvetica, sans-serif"
      role="img"
      aria-label="Graphique en barres"
    >
      <rect width={LARGEUR} height={HAUTEUR} fill="#ffffff" />
      <text x={MARGES.gauche - 8} y={MARGES.haut - 14} textAnchor="end" fontSize="12" fill="#6b7280">
        {unite}
      </text>
      <text x={LARGEUR - MARGES.droite} y={HAUTEUR - 6} textAnchor="end" fontSize="12" fill="#6b7280">
        {granularite === "mois" ? "Mois" : "Jour"}
      </text>

      {valeursGraduations(echelle).map((valeur) => (
        <g key={valeur}>
          <line
            x1={MARGES.gauche}
            x2={LARGEUR - MARGES.droite}
            y1={yPour(valeur)}
            y2={yPour(valeur)}
            stroke={valeur === 0 ? "#9ca3af" : "#e5e7eb"}
          />
          <text x={MARGES.gauche - 8} y={yPour(valeur) + 4} textAnchor="end" fontSize="13" fill="#6b7280">
            {Math.round(valeur).toLocaleString("fr-FR")}
          </text>
        </g>
      ))}

      {barres.map((barre, index) => {
        const centre = MARGES.gauche + largeurCase * (index + 0.5);
        const hauteur = (barre.valeur / echelle) * zoneHauteur;
        const y = ligneBase - hauteur;

        return (
          <g key={`${index}-${barre.libelle}`}>
            <rect x={centre - largeurBarre / 2} y={y} width={largeurBarre} height={hauteur} rx="4" fill={barre.couleur} />
            {afficherValeurs && (
              <text x={centre} y={y - 8} textAnchor="middle" fontSize={tailleValeur} fontWeight="bold" fill="#111827">
                {formaterValeur(barre.valeur)}
              </text>
            )}
            {index % saut === 0 && (
              <text x={centre} y={ligneBase + 20} textAnchor="middle" fontSize="13" fill="#374151">
                {barre.libelle}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
