import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../api/axios";
import { User } from "lucide-react";
import NavbarMedecin from "../components/NavbarMedecin";
import CropImageModal from "../../../components/CropImageModal";
import styles from "./MedecinProfile.module.css";
import { validatePhone } from "../../../utils/phoneValidation";

export default function MedecinProfile() {
  const { user } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    specialite_id: "",
    telephone: "",
    description: "",
    adresse: "",
    ville: "",
  });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [specialites, setSpecialites] = useState([]);
  const [filteredSpecialites, setFilteredSpecialites] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Charger le profil et les spécialités au montage
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Charger le profil médecin
        const res = await api.get("/medecin/profile");
        if (res.data) {
          setProfile(res.data);
          setPhotoUrl(res.data.photo_url || null);

          // Mettre à jour le searchTerm avec le nom de la spécialité
          if (res.data.specialite_nom) {
            setSearchTerm(res.data.specialite_nom);
          }
        }

        // Charger les spécialités
        const specialitesRes = await api.get("/specialites");
        setSpecialites(specialitesRes.data.specialites || []);
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrer les spécialités selon la recherche
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSpecialites([]);
    } else {
      const filtered = specialites.filter((specialite) =>
        specialite.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSpecialites(filtered);
    }
  }, [searchTerm, specialites]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSpecialiteSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);

    // Si l'utilisateur efface la recherche, effacer aussi l'ID
    if (value.trim() === "") {
      setProfile((prev) => ({ ...prev, specialite_id: "" }));
    }
  };

  const selectSpecialite = (specialite) => {
    setProfile((prev) => ({
      ...prev,
      specialite_id: specialite.id,
    }));
    setSearchTerm(specialite.nom);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const phoneError = validatePhone(profile.telephone);
    if (phoneError) {
      setMessage(phoneError);
      setMessageType("error");
      setTimeout(() => setMessage(""), 5000);
      return;
    }

    try {
      const res = await api.put("/medecin/profile", profile);
      setMessage("✅ Profil mis à jour avec succès !");
      setMessageType("success");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      setMessage("❌ Erreur de mise à jour");
      setMessageType("error");
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (blob) => {
    setShowCropModal(false);
    setCropSrc(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", blob, "photo-profil.png");
      const res = await api.post("/medecin/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(res.data.photo_url);
      setMessage("✅ Photo de profil mise à jour !");
      setMessageType("success");
      setTimeout(() => setMessage(""), 2000);
    } catch (err) {
      console.error("Erreur upload photo:", err);
      setMessage("❌ Erreur lors de l'upload de la photo");
      setMessageType("error");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <NavbarMedecin />
        <div className={styles.mainContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={styles.container}>
      <NavbarMedecin />

      <div className={styles.mainContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Mon Profil Médecin</h1>
          <p className={styles.pageSubtitle}>Gérez vos informations professionnelles</p>
        </div>

        {/* Avatar Section */}
        <div className={styles.avatarSection}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={handleAvatarClick}
            disabled={uploadingPhoto}
            title="Changer la photo de profil"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="Photo de profil" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <User className={styles.avatarIcon} />
              </div>
            )}
            <div className={styles.avatarOverlay}>
              {uploadingPhoto ? "⏳" : "📷"}
            </div>
          </button>
          <p className={styles.avatarHint}>Cliquez pour changer la photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`${styles.messageContainer} ${messageType === "success" ? styles.messageSuccess : styles.messageError}`}
          >
            {message}
          </div>
        )}

        {/* Info Section */}
        <div className={styles.infoSection}>
          💡 Mettez à jour vos informations professionnelles pour aider les patients à vous trouver
          facilement.
        </div>

        {/* Profile Card */}
        <div className={styles.profileCard}>
          <h2 className={styles.profileCardTitle}>📋 Informations Professionnelles</h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Autocomplete Spécialité */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Spécialité *</label>
                <div className={styles.autocompleteContainer}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSpecialiteSearch}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Renseigner une spécialité..."
                    className={styles.formInput}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {showSuggestions && filteredSpecialites.length > 0 && (
                    <div className={styles.suggestionsList}>
                      {filteredSpecialites.map((specialite) => (
                        <div
                          key={specialite.id}
                          className={styles.suggestionItem}
                          onClick={() => selectSpecialite(specialite)}
                        >
                          {specialite.nom}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="hidden"
                  name="specialite_id"
                  value={profile.specialite_id}
                  onChange={handleChange}
                />
              </div>

              {/* Téléphone */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Téléphone</label>
                <input
                  type="tel"
                  name="telephone"
                  value={profile.telephone || ""}
                  onChange={handleChange}
                  placeholder="Ex: +33 6 12 34 56 78"
                  className={styles.formInput}
                />
              </div>

              {/* Adresse */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Adresse</label>
                <input
                  type="text"
                  name="adresse"
                  value={profile.adresse || ""}
                  onChange={handleChange}
                  placeholder="Ex: 123 Rue de la Paix"
                  className={styles.formInput}
                />
              </div>

              {/* Ville */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ville</label>
                <input
                  type="text"
                  name="ville"
                  value={profile.ville || ""}
                  onChange={handleChange}
                  placeholder="Ex: Paris"
                  className={styles.formInput}
                />
              </div>

              {/* Description */}
              <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                <label className={styles.formLabel}>Description Professionnelle</label>
                <textarea
                  name="description"
                  value={profile.description || ""}
                  onChange={handleChange}
                  placeholder="Présentez votre expérience et vos compétences..."
                  className={styles.formTextarea}
                  rows="4"
                />
              </div>
            </div>

            {/* Button Container */}
            <div className={styles.buttonContainer}>
              <button type="submit" className={styles.submitButton}>
                Sauvegarder les modifications
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    {showCropModal && cropSrc && (
      <CropImageModal
        imageSrc={cropSrc}
        onClose={() => { setShowCropModal(false); setCropSrc(null); }}
        onSave={handleCropSave}
      />
    )}
    </>
  );
}
