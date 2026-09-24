import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Stethoscope } from "lucide-react";
import { toast } from "react-toastify";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  // Validation côté frontend
  const validateIdentifier = (identifier) => {
    if (!identifier) return "L'email ou numéro client est requis";
    // Accepter soit un email valide soit un numéro client (10 caractères)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(identifier);
    const isClientId = /^[A-Z0-9]{10}$/.test(identifier);
    if (!isEmail && !isClientId) {
      return "Entrez un email valide ou votre numéro client (10 caractères)";
    }
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Le mot de passe est requis";
    if (password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères";
    return "";
  };

  const handleIdentifierBlur = () => {
    setErrors((prev) => ({ ...prev, email: validateIdentifier(email) }));
  };

  const handlePasswordBlur = () => {
    setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });

    // Validation frontend
    const identifierError = validateIdentifier(email);
    const passwordError = validatePassword(password);

    if (identifierError || passwordError) {
      setErrors({ email: identifierError, password: passwordError });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      setLoading(false);

      // Gérer le cas du compte désactivé par un administrateur
      if (error.response?.data?.isDisabled) {
        toast.error(
          error.response.data.message ||
            "Votre compte a été désactivé par un administrateur. Veuillez contacter le support pour plus d'informations.",
          {
            position: "top-right",
            autoClose: false,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
        setErrors({
          email: "",
          password: "Compte désactivé",
        });
        return;
      }

      // Gérer le cas du compte en attente de vérification
      if (error.response?.status === 403) {
        toast.warning(
          "🕐 Votre compte est en cours de vérification\n\nVotre inscription en tant que médecin indépendant est en attente de validation par un administrateur. Veuillez patienter quelques heures.",
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
        setErrors({
          email: "",
          password: "Compte en attente de vérification",
        });
        return;
      }

      // Gérer les erreurs du backend
      if (error.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        setErrors({
          email: backendErrors.email?.[0] || "",
          password: backendErrors.password?.[0] || "",
        });
      } else if (error.response?.status === 401) {
        // Message générique pour erreur de connexion
        setErrors({
          email: "",
          password: error.response?.data?.message || "Identifiant ou mot de passe incorrect",
        });
      } else {
        setErrors({
          email: "",
          password: "Erreur de connexion. Veuillez réessayer.",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center pr-12">
        <div className="mb-8 cursor-pointer" onClick={() => navigate("/")}>
          <img
            src="/logo/fulllogo_transparent_nobuffer.png"
            alt="MediConnect Logo"
            className="h-24 object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">MediConnect</h1>
        <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
          Votre plateforme médicale de référence pour une santé connectée
        </p>

        {/* Features */}
        <div className="space-y-6 w-full max-w-md">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Rendez-vous en ligne</h3>
              <p className="text-gray-600 text-sm">Prenez vos rendez-vous en quelques clics</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Suivi médical</h3>
              <p className="text-gray-600 text-sm">Accédez à vos dossiers et consultations</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Sécurisé et confidentiel</h3>
              <p className="text-gray-600 text-sm">
                Vos données protégées par les normes médicales
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div
              className="flex items-center justify-center mb-4 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img
                src="/logo/fulllogo_transparent_nobuffer.png"
                alt="MediConnect Logo"
                className="h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center">MediConnect</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue</h2>
          <p className="text-gray-600 mb-8">Connectez-vous à votre compte</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email or Client ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ou Numéro Client
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="exemple@email.com ou ABC12XY89Z"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  onBlur={handleIdentifierBlur}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.email ? "focus:ring-red-500" : "focus:ring-blue-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  onBlur={handlePasswordBlur}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-start">
                  <span className="mr-1 mt-0.5">ℹ️</span>
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                <span className="text-gray-600">Se souvenir de moi</span>
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600">
            Pas encore de compte ?{" "}
            <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              S'inscrire
            </a>
          </p>

          {/* Director Request Link */}
          <p className="text-center text-gray-600 text-sm mt-4">
            Vous voulez faire la demande d'un compte de directeur ?{" "}
            <a
              href="/demande-directeur"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Faire une demande
            </a>
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            En vous connectant, vous acceptez nos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              conditions d'utilisation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
