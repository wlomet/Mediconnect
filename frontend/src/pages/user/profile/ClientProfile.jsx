import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, Copy, Check } from "lucide-react";
import api from "../../../api/axios";
import UserNavbar from "../components/UserNavbar";
import styles from "../../public/rdv/SearchMedecin.module.css";
import { validatePhone } from "../../../utils/phoneValidation";
import ClientAntecedents from "./ClientAntecedents";

export default function ClientProfile() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);

  // Rediriger si pas connecté ou pas client
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Charger le profil au montage
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/client/profile");
        setProfile(res.data.user);
        setFormData({
          name: res.data.user.name,
          email: res.data.user.email,
          phone: res.data.user.phone || "",
        });
      } catch (err) {
        console.error("Erreur lors du chargement du profil:", err);
        setMessage({ type: "error", text: "Erreur lors du chargement du profil" });
      }
    };

    if (!loading && user) {
      fetchProfile();
    }
  }, [loading, user]);

  const handleCopyClientId = () => {
    if (profile?.client_id) {
      navigator.clipboard.writeText(profile.client_id);
      setClientIdCopied(true);
      setTimeout(() => setClientIdCopied(false), 2000);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setMessage({ type: "error", text: phoneError });
      return;
    }

    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await api.put("/client/profile", formData);
      setProfile(res.data.user);
      setEditMode(false);
      setMessage({ type: "success", text: "Profil mis à jour avec succès" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      const errorText = err.response?.data?.message || "Erreur lors de la mise à jour du profil";
      setMessage({ type: "error", text: errorText });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    // Validation
    if (!passwordData.current_password) {
      setMessage({ type: "error", text: "Veuillez entrer votre mot de passe actuel" });
      setSubmitting(false);
      return;
    }

    if (!passwordData.password) {
      setMessage({ type: "error", text: "Veuillez entrer votre nouveau mot de passe" });
      setSubmitting(false);
      return;
    }

    if (passwordData.password.length < 6) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères" });
      setSubmitting(false);
      return;
    }

    if (passwordData.password !== passwordData.password_confirmation) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.put("/client/profile", {
        current_password: passwordData.current_password,
        password: passwordData.password,
        password_confirmation: passwordData.password_confirmation,
      });

      setShowPasswordForm(false);
      setPasswordData({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setMessage({ type: "success", text: "Mot de passe changé avec succès" });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      if (err.response?.data?.errors?.current_password) {
        setMessage({
          type: "error",
          text: err.response.data.errors.current_password[0],
        });
      } else {
        const errorText =
          err.response?.data?.message || "Erreur lors du changement de mot de passe";
        setMessage({ type: "error", text: errorText });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <UserNavbar />
        <div className="flex justify-center items-center h-64">Chargement...</div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <UserNavbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800">Mon Profil</h1>
            <p className="text-gray-600 mt-2">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>

          {/* Messages */}
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-lg border ${message.type === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
                }`}
            >
              <p
                className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {profile && (
            <>
              {/* Client ID Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-l-4 border-blue-500">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Identifiant Client</h2>
                <div className="flex items-center space-x-4 bg-blue-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Votre numéro client unique</p>
                    <p className="text-2xl font-mono font-bold text-blue-600">
                      {profile.client_id}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyClientId}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                  >
                    {clientIdCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copié!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Profile Information Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">Informations Personnelles</h2>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`px-4 py-2 rounded-lg transition ${editMode
                        ? "bg-gray-300 hover:bg-gray-400 text-gray-800"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                  >
                    {editMode ? "Annuler" : "Modifier"}
                  </button>
                </div>

                {editMode ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom complet
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro de téléphone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          placeholder="+33 6 12 34 56 78"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Display Mode */}
                    <div>
                      <p className="text-sm text-gray-600">Nom complet</p>
                      <p className="text-lg font-medium text-gray-800">{profile.name}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Adresse email</p>
                      <p className="text-lg font-medium text-gray-800">{profile.email}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600">Numéro de téléphone</p>
                      <p className="text-lg font-medium text-gray-800">
                        {profile.phone || "Non renseigné"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Antécédents médicaux */}
              <ClientAntecedents />

              {/* Change Password Section */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Sécurité</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Changez votre mot de passe pour sécuriser votre compte
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className={`px-4 py-2 rounded-lg transition ${showPasswordForm
                        ? "bg-gray-300 hover:bg-gray-400 text-gray-800"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                      }`}
                  >
                    {showPasswordForm ? "Annuler" : "Changer le mot de passe"}
                  </button>
                </div>

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="space-y-5">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe actuel
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.current_password}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              current_password: e.target.value,
                            })
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.password}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              password: e.target.value,
                            })
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                      <p className="text-gray-500 text-xs mt-2">Minimum 6 caractères</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmer le mot de passe
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={passwordData.password_confirmation}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              password_confirmation: e.target.value,
                            })
                          }
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {submitting ? "Changement en cours..." : "Changer le mot de passe"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
