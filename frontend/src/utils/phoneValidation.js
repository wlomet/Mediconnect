// Format international attendu : + suivi de 8 a 15 chiffres (norme E.164)
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

export const normalizePhone = (value) => String(value ?? "").replace(/[\s.\-()]/g, "");

// Retourne un message d'erreur, ou "" si le numero est valide ou vide
export const validatePhone = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (!PHONE_REGEX.test(normalizePhone(trimmed))) {
    return "Le numéro doit être au format international (ex. +33 6 12 34 56 78)";
  }
  return "";
};
