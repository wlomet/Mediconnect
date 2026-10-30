import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Building, UserCheck, MapPin, Phone } from "lucide-react";
import axios from "../../api/axios";
import { validatePhone } from "../../utils/phoneValidation";

export default function DirectorRequest() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    hopital_name: "",
    hopital_adresse: "",
    hopital_telephone: "",
    hopital_ville: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    hopital_name: "",
    hopital_adresse: "",
    hopital_telephone: "",
    hopital_ville: "",
    general: "",
  });
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Validation côté frontend
  const validateName = (name) => {
    if (!name.trim()) return "Le nom est requis";
    if (name.length > 255) return "Le nom ne peut pas dépasser 255 caractères";
    return "";
  };

  const validateEmail = (email) => {
    if (!email) return "L'adresse email est requise";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "L'adresse email n'est pas valide";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Le mot de passe est requis";
    if (password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères";
    return "";
  };

  const validateField = (fieldName, value) => {
    if (!value.trim()) return `Ce champ est requis`;
    if (fieldName === "hopital_telephone") return validatePhone(value);
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({
      name: "",
      email: "",
      password: "",
      hopital_name: "",
      hopital_adresse: "",
      hopital_telephone: "",
      hopital_ville: "",
      general: "",
    });

    // Validation frontend
    const nameError = validateName(form.name);
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const hopitalNameError = validateField("hopital_name", form.hopital_name);
    const hopitalAdresseError = validateField("hopital_adresse", form.hopital_adresse);
    const hopitalTelephoneError = validateField("hopital_telephone", form.hopital_telephone);
    const hopitalVilleError = validateField("hopital_ville", form.hopital_ville);

    if (
      nameError ||
      emailError ||
      passwordError ||
      hopitalNameError ||
      hopitalAdresseError ||
      hopitalTelephoneError ||
      hopitalVilleError
    ) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        hopital_name: hopitalNameError,
        hopital_adresse: hopitalAdresseError,
        hopital_telephone: hopitalTelephoneError,
        hopital_ville: hopitalVilleError,
        general: "",
      });
      setLoading(false);
      return;
    }

    try {
      await axios.post("/demande-directeur", form);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setLoading(false);

      // Gérer les différents types d'erreurs
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        setErrors({
          name: backendErrors.name?.[0] || "",
          email: backendErrors.email?.[0] || "",
          password: backendErrors.password?.[0] || "",
          hopital_name: backendErrors.hopital_name?.[0] || "",
          hopital_adresse: backendErrors.hopital_adresse?.[0] || "",
          hopital_telephone: backendErrors.hopital_telephone?.[0] || "",
          hopital_ville: backendErrors.hopital_ville?.[0] || "",
          general: "",
        });
      } else if (err.response?.status >= 500) {
        setErrors({
          name: "",
          email: "",
          password: "",
          hopital_name: "",
          hopital_adresse: "",
          hopital_telephone: "",
          hopital_ville: "",
          general:
            "Problème de l'application, veuillez réessayer plus tard ou contactez le support",
        });
      } else {
        setErrors({
          name: "",
          email: "",
          password: "",
          hopital_name: "",
          hopital_adresse: "",
          hopital_telephone: "",
          hopital_ville: "",
          general: "Une erreur est survenue lors de l'envoi de votre demande",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center pr-12">
        <div className="mb-8">
          <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full shadow-lg">
            <Building className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Demande Directeur</h1>
        <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
          Demandez un compte directeur pour gérer votre hôpital et ses ressources médicales
        </p>

        {/* Benefits */}
        <div className="space-y-6 w-full max-w-md">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Remplissez le formulaire</h3>
              <p className="text-gray-600 text-sm">
                Fournissez vos informations et celles de votre hôpital
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Validation par l'admin</h3>
              <p className="text-gray-600 text-sm">Notre équipe examine votre demande</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Compte activé</h3>
              <p className="text-gray-600 text-sm">Recevez un email de confirmation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Request Form */}
      <div className="w-full lg:w-1/2 max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full shadow-lg">
                <Building className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center">MediConnect</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Demande de compte directeur</h2>
          <p className="text-gray-600 mb-8">Votre demande sera examinée par notre équipe</p>

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{errors.general}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm font-medium">
                Votre demande a été envoyée avec succès ! Vous serez notifié par email une fois
                approuvée.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Jean Dupont"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.name}
                </p>
              )}
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email professionnelle
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="directeur@hopital.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.email ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.email}
                </p>
              )}
            </div>

            {/* Hopital Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'hôpital
              </label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Hôpital Central"
                  value={form.hopital_name}
                  onChange={(e) => {
                    setForm({ ...form, hopital_name: e.target.value });
                    if (errors.hopital_name) setErrors((prev) => ({ ...prev, hopital_name: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.hopital_name ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.hopital_name ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.hopital_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.hopital_name}
                </p>
              )}
            </div>

            {/* Hopital Address Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse de l'hôpital
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="123 Rue de la Santé"
                  value={form.hopital_adresse}
                  onChange={(e) => {
                    setForm({ ...form, hopital_adresse: e.target.value });
                    if (errors.hopital_adresse)
                      setErrors((prev) => ({ ...prev, hopital_adresse: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.hopital_adresse ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.hopital_adresse ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.hopital_adresse && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.hopital_adresse}
                </p>
              )}
            </div>

            {/* Hopital City Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Paris"
                  value={form.hopital_ville}
                  onChange={(e) => {
                    setForm({ ...form, hopital_ville: e.target.value });
                    if (errors.hopital_ville) setErrors((prev) => ({ ...prev, hopital_ville: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.hopital_ville ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.hopital_ville ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.hopital_ville && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.hopital_ville}
                </p>
              )}
            </div>

            {/* Hopital Telephone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone de l'hôpital
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="01 23 45 67 89"
                  value={form.hopital_telephone}
                  onChange={(e) => {
                    setForm({ ...form, hopital_telephone: e.target.value });
                    if (errors.hopital_telephone)
                      setErrors((prev) => ({ ...prev, hopital_telephone: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.hopital_telephone ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.hopital_telephone ? "focus:ring-red-500" : "focus:ring-gray-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.hopital_telephone && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.hopital_telephone}
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
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
                />
              </div>
              {errors.password ? (
                <p className="mt-2 text-sm text-red-600 flex items-start">
                  <span className="mr-1 mt-0.5">ℹ️</span>
                  <span>{errors.password}</span>
                </p>
              ) : (
                <p className="text-gray-500 text-xs mt-2">Au moins 6 caractères</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Envoyer ma demande</span>
                </>
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

          {/* Login/Register Links */}
          <div className="space-y-2 text-center text-sm">
            <p className="text-gray-600">
              Vous avez déjà un compte ?{" "}
              <a href="/login" className="text-gray-700 hover:text-gray-800 font-semibold">
                Se connecter
              </a>
            </p>
            <p className="text-gray-600">
              Vous êtes un patient ou médecin ?{" "}
              <a href="/register" className="text-gray-700 hover:text-gray-800 font-semibold">
                S'inscrire
              </a>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Besoin d'aide ?{" "}
            <a href="#" className="text-gray-700 hover:underline">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
