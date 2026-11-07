import { echelleMaximale, libelleDebut, pasEntreLibelles, valeursGraduations } from "./graphiqueUtils";

const LARGEUR = 560;
const HAUTEUR = 320;
const MARGES = { haut: 44, droite: 16, bas: 48, gauche: 52 };
const ESPACE_LEGENDE = 150;

// Graphique SVG en courbes : les styles sont en attributs pour rester fidèles à l'export PNG
export default function GraphiqueCourbes({ svgRef, points, granularite, series, unite, formaterValeur }) {
  const zoneLargeur = LARGEUR - MARGES.gauche - MARGES.droite;
  const zoneHauteur = HAUTEUR - MARGES.haut - MARGES.bas;
  const ligneBase = MARGES.haut + zoneHauteur;
  const valeurMax = Math.max(0, ...points.flatMap((point) => series.map((serie) => point[serie.cle])));
  const echelle = echelleMaximale(valeurMax, { entier: true });
  const saut = pasEntreLibelles(points.length);
  const xPour = (index) =>
    points.length > 1
      ? MARGES.gauche + (zoneLargeur * index) / (points.length - 1)
      : MARGES.gauche + zoneLargeur / 2;
  const yPour = (valeur) => ligneBase - (valeur / echelle) * zoneHauteur;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
      width="100%"
      fontFamily="Arial, Helvetica, sans-serif"
      role="img"
      aria-label="Graphique en courbes"
    >
      <rect width={LARGEUR} height={HAUTEUR} fill="#ffffff" />

      {series.map((serie, index) => (
        <g key={serie.cle} transform={`translate(${MARGES.gauche + index * ESPACE_LEGENDE}, 14)`}>
          <line x1="0" x2="24" y1="0" y2="0" stroke={serie.couleur} strokeWidth="3" />
          <text x="32" y="4" fontSize="13" fill="#374151">
            {serie.libelle}
          </text>
        </g>
      ))}

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

      {series.map((serie) => (
        <g key={serie.cle}>
          <polyline
            points={points.map((point, index) => `${xPour(index)},${yPour(point[serie.cle])}`).join(" ")}
            fill="none"
            stroke={serie.couleur}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle key={point.debut} cx={xPour(index)} cy={yPour(point[serie.cle])} r="3.5" fill={serie.couleur}>
              <title>{`${serie.libelle} · ${libelleDebut(point.debut, granularite)} : ${formaterValeur(point[serie.cle])}`}</title>
            </circle>
          ))}
        </g>
      ))}

      {points.map((point, index) =>
        index % saut === 0 ? (
          <text key={point.debut} x={xPour(index)} y={ligneBase + 22} textAnchor="middle" fontSize="13" fill="#374151">
            {libelleDebut(point.debut, granularite)}
          </text>
        ) : null
      )}
    </svg>
  );
}
