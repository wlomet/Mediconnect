import { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, Stethoscope, UserCheck, Phone } from "lucide-react";
import Navbar from "./Navbar";
import { validatePhone } from "../../utils/phoneValidation";

export default function Register() {
  const { register } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "client",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    general: "",
  });
  const [success, setSuccess] = useState(false);
  const [medecinValidation, setMedecinValidation] = useState(false);
  const [documents, setDocuments] = useState({
    document_identite: null,
    justificatif_validite: null,
  });
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

  const handleDocumentChange = (field) => (e) => {
    const file = e.target.files[0] || null;
    setDocuments((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({ name: "", email: "", password: "", phone: "", general: "" });

    // Validation frontend
    const nameError = validateName(form.name);
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const phoneError = validatePhone(form.phone);

    // Validation checkbox pour médecins
    if (form.role === "medecin" && !medecinValidation) {
      setErrors({
        name: "",
        email: "",
        password: "",
        phone: "",
        general: "Vous devez valider que vous êtes un médecin indépendant",
      });
      setLoading(false);
      return;
    }

    if (form.role === "medecin" && (!documents.document_identite || !documents.justificatif_validite)) {
      setErrors({
        name: "",
        email: "",
        password: "",
        phone: "",
        general: "Veuillez joindre votre pièce d'identité et votre justificatif de validité",
      });
      setLoading(false);
      return;
    }

    if (nameError || emailError || passwordError || phoneError) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        phone: phoneError,
        general: "",
      });
      setLoading(false);
      return;
    }

    try {
      await register(form.name, form.email, form.password, form.phone, form.role, documents);
      setSuccess(true);

      // Si médecin, rediriger vers la page de vérification
      if (form.role === "medecin") {
        setTimeout(() => {
          navigate("/pending-approval");
        }, 1500);
      } else {
        // Sinon rediriger vers login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      setLoading(false);

      // Gérer les différents types d'erreurs
      if (err.response?.data?.errors) {
        const backendErrors = err.response.data.errors;
        setErrors({
          name: backendErrors.name?.[0] || "",
          email: backendErrors.email?.[0] || "",
          password: backendErrors.password?.[0] || "",
          phone: backendErrors.phone?.[0] || "",
          general:
            backendErrors.document_identite?.[0] || backendErrors.justificatif_validite?.[0] || "",
        });
      } else if (err.response?.status >= 500) {
        // Erreur serveur
        setErrors({
          name: "",
          email: "",
          password: "",
          phone: "",
          general:
            "Problème de l'application, veuillez réessayer plus tard ou contactez le support",
        });
      } else {
        // Autre erreur
        setErrors({
          name: "",
          email: "",
          password: "",
          phone: "",
          general: "Une erreur est survenue lors de l'inscription",
        });
      }
    }
  };

  return (
    <>
      <Navbar />
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
          Rejoignez notre communauté médicale et commencez votre parcours de santé connectée
        </p>

        {/* Benefits */}
        <div className="space-y-6 w-full max-w-md">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Accès gratuit</h3>
              <p className="text-gray-600 text-sm">
                Créez votre compte gratuitement sans engagement
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Simple et rapide</h3>
              <p className="text-gray-600 text-sm">Inscription en moins de 2 minutes</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Sécurisé</h3>
              <p className="text-gray-600 text-sm">Vos données sont protégées et confidentielles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Register Form */}
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

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Créer un compte</h2>
          <p className="text-gray-600 mb-8">Rejoignez MediConnect en quelques secondes</p>

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
                Inscription réussie ! Redirection...
              </p>
            </div>
          )}

          <div className="space-y-5">
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
                    errors.name ? "focus:ring-red-500" : "focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="exemple@email.com"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
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

            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone (optionnel)
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    errors.phone ? "focus:ring-red-500" : "focus:ring-blue-500"
                  } focus:border-transparent transition`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span> {errors.phone}
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
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Je m'inscris en tant que...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition ${form.role === "client" ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    checked={form.role === "client"}
                    onChange={(e) => {
                      setForm({ ...form, role: e.target.value });
                      setMedecinValidation(false);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800 text-sm">Patient</p>
                    <p className="text-gray-500 text-xs">Consulter un médecin</p>
                  </div>
                </label>

                <label
                  className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition ${form.role === "medecin" ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="medecin"
                    checked={form.role === "medecin"}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-4 h-4"
                  />
                  <div className="ml-3">
                    <p className="font-semibold text-gray-800 text-sm">Médecin indépendant</p>
                    <p className="text-gray-500 text-xs">Gérer mes patients</p>
                  </div>
                </label>
              </div>

              {/* Médecin Validation Message */}
              {form.role === "medecin" && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={medecinValidation}
                      onChange={(e) => setMedecinValidation(e.target.checked)}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-blue-700">
                      Je valide être un médecin indépendant. Mon compte sera vérifié par un
                      administrateur avant activation.
                    </span>
                  </label>
                </div>
              )}

              {/* Documents médecin */}
              {form.role === "medecin" && (
                <div className="mt-4 space-y-4">
                  {[
                    {
                      field: "document_identite",
                      label: "Pièce d'identité",
                      hint: "Carte nationale d'identité, passeport, etc.",
                    },
                    {
                      field: "justificatif_validite",
                      label: "Justificatif de validité",
                      hint: "Attestation d'inscription à l'Ordre des médecins, etc.",
                    },
                  ].map(({ field, label, hint }) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label} <span className="text-red-500">*</span>
                      </label>
                      <p className="text-gray-500 text-xs mb-2">{hint}</p>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentChange(field)}
                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {documents[field] && (
                        <p className="text-xs text-green-600 mt-1">{documents[field].name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2">
              <input type="checkbox" required className="w-4 h-4 mt-1 rounded border-gray-300" />
              <label className="text-sm text-gray-600">
                J'accepte les{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  conditions d'utilisation
                </a>{" "}
                et la{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  politique de confidentialité
                </a>
              </label>
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
                  <span>Inscription en cours...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Créer mon compte</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">ou</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-600">
            Vous avez déjà un compte ?{" "}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Se connecter
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
            Besoin d'aide ?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
