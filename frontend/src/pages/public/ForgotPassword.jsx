import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../../api/axios";
import Navbar from "./Navbar";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Validation côté frontend
  const validateEmail = (value) => {
    if (!value) return "L'adresse email est requise";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Entrez une adresse email valide";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Le backend répond de la même façon que le compte existe ou non
      await api.post("/forgot-password", { email });
      setSent(true);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Trop de tentatives. Veuillez patienter une minute avant de réessayer.");
      } else {
        setError(err.response?.data?.errors?.email?.[0] || "Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Vérifiez votre boîte mail</h2>
              <p className="text-gray-600 mb-2">
                Si un compte existe pour cette adresse, un email contenant un lien de réinitialisation
                vient d'être envoyé.
              </p>
              <p className="text-gray-500 text-sm mb-8">Pensez à vérifier vos spams.</p>
              <Link
                to="/login"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Mot de passe oublié</h2>
              <p className="text-gray-600 mb-8">
                Saisissez l'adresse email de votre compte. Si elle est enregistrée, vous recevrez un lien
                pour choisir un nouveau mot de passe.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="exemple@email.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      className={`w-full pl-12 pr-4 py-3 border ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                        } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition`}
                    />
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>Envoyer le lien</span>
                  )}
                </button>
              </form>

              <p className="text-center text-sm mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
