import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../api/axios";
import Navbar from "./Navbar";

const EMPTY_ERRORS = { password: "", passwordConfirmation: "", general: "" };

const inputClass = (hasError) =>
  `w-full pl-12 pr-4 py-3 border ${hasError ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
  } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Token et email transmis par le lien reçu dans l'email
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation côté frontend
    const newErrors = { ...EMPTY_ERRORS };
    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 6) {
      newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }
    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = "Veuillez confirmer le mot de passe";
    } else if (passwordConfirmation !== password) {
      newErrors.passwordConfirmation = "Les mots de passe ne correspondent pas";
    }

    if (newErrors.password || newErrors.passwordConfirmation) {
      setErrors(newErrors);
      return;
    }

    setErrors(EMPTY_ERRORS);
    setLoading(true);
    try {
      const res = await api.post("/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success(res.data?.message || "Votre mot de passe a été réinitialisé.");
      navigate("/login", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const fieldErrors = data?.errors || {};

      if (err.response?.status === 429) {
        setErrors({
          ...EMPTY_ERRORS,
          general: "Trop de tentatives. Veuillez patienter une minute avant de réessayer.",
        });
      } else if (fieldErrors.password) {
        // Règle de longueur ou confirmation (le backend rattache les deux à "password")
        setErrors({ ...EMPTY_ERRORS, password: fieldErrors.password[0] });
      } else {
        // Lien invalide ou expiré : message renvoyé par le backend
        setErrors({
          ...EMPTY_ERRORS,
          general:
            fieldErrors.token?.[0] ||
            fieldErrors.email?.[0] ||
            data?.message ||
            "Erreur de connexion. Veuillez réessayer.",
        });
      }
      setLoading(false);
    }
  };

  // Lien incomplet : on ne peut pas réinitialiser sans token et email
  if (!token || !email) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Lien incomplet</h2>
            <p className="text-gray-600 mb-8">
              Ce lien de réinitialisation est incomplet. Demandez un nouveau lien pour choisir votre mot de
              passe.
            </p>
            <Link
              to="/mot-de-passe-oublie"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
            >
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Nouveau mot de passe</h2>
          <p className="text-gray-600 mb-8">
            Choisissez un nouveau mot de passe pour le compte{" "}
            <span className="font-medium text-gray-800">{email}</span>.
          </p>

          {errors.general && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={inputClass(errors.password)}
                />
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirmation du mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value);
                    if (errors.passwordConfirmation)
                      setErrors((prev) => ({ ...prev, passwordConfirmation: "" }));
                  }}
                  className={inputClass(errors.passwordConfirmation)}
                />
              </div>
              {errors.passwordConfirmation && (
                <p className="mt-2 text-sm text-red-600">{errors.passwordConfirmation}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Enregistrement en cours...</span>
                </>
              ) : (
                <span>Réinitialiser le mot de passe</span>
              )}
            </button>
          </form>

          <div className="text-center text-sm mt-8 space-y-3">
            <p>
              <Link
                to="/mot-de-passe-oublie"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Demander un nouveau lien
              </Link>
            </p>
            <p>
              <Link
                to="/login"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
