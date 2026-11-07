const GRADUATIONS = 4;
const MAX_LIBELLES = 12;

// Pas arrondi (1, 2, 5 ou 10 × puissance de 10) supérieur ou égal à la valeur
const pasRond = (valeur) => {
  const puissance = 10 ** Math.floor(Math.log10(valeur));
  const fraction = valeur / puissance;
  const rond = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return rond * puissance;
};

// Avec `entier`, les graduations sont des entiers (comptages)
export const echelleMaximale = (valeurMax, { entier = false } = {}) => {
  if (valeurMax <= 0) return GRADUATIONS;

  const pas = pasRond(valeurMax / GRADUATIONS);
  return GRADUATIONS * (entier ? Math.max(1, Math.ceil(pas)) : pas);
};

export const valeursGraduations = (echelle) =>
  Array.from({ length: GRADUATIONS + 1 }, (_, i) => (echelle / GRADUATIONS) * i);

// Libellé d'un point : MM/AA pour un mois, JJ/MM pour un jour
export const libelleDebut = (debut, granularite) => {
  const [annee, mois, jour] = debut.split("-");
  return granularite === "mois" ? `${mois}/${annee.slice(2)}` : `${jour}/${mois}`;
};

// Un libellé sur n pour garder l'axe lisible
export const pasEntreLibelles = (nombre) => Math.ceil(nombre / MAX_LIBELLES);
