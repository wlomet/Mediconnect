import { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, Phone, User, Building2, Stethoscope } from "lucide-react";
import styles from "./SearchMedecin.module.css";
import ModalHoraires from "./components/ModalHoraires";
import ModalHopital from "./components/ModalHopital";
import api from "/src/api/axios";

const SUGGESTION_DEBOUNCE_MS = 250;

export default function SearchMedecin() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ville, setVille] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedMedecin, setSelectedMedecin] = useState(null);
  const [showHorairesModal, setShowHorairesModal] = useState(false);
  const [selectedHopitalDetails, setSelectedHopitalDetails] = useState(null);
  const [showHopitalModal, setShowHopitalModal] = useState(false);
  const [loadingHopitalId, setLoadingHopitalId] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [villeSuggestions, setVilleSuggestions] = useState([]);
  const [showVilleSuggestions, setShowVilleSuggestions] = useState(false);
  const suggestionsTimer = useRef(null);
  const villeTimer = useRef(null);

  // Autocomplétion sur le nom / spécialité / établissement
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    clearTimeout(suggestionsTimer.current);
    suggestionsTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(
          `/search/suggestions?query=${encodeURIComponent(searchQuery)}`
        );
        setSuggestions(res.data);
      } catch (error) {
        console.error("Erreur lors du chargement des suggestions:", error);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => clearTimeout(suggestionsTimer.current);
  }, [searchQuery]);

  // Autocomplétion sur la ville (proposée dès le focus, même sans saisie)
  useEffect(() => {
    clearTimeout(villeTimer.current);
    villeTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search/villes?query=${encodeURIComponent(ville)}`);
        setVilleSuggestions(res.data);
      } catch (error) {
        console.error("Erreur lors du chargement des villes:", error);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => clearTimeout(villeTimer.current);
  }, [ville]);

  const performSearch = async (queryValue, villeValue) => {
    if (!queryValue.trim() && !villeValue.trim()) {
      return;
    }

    setShowSuggestions(false);
    setShowVilleSuggestions(false);
    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (queryValue.trim()) params.append("query", queryValue.trim());
      if (villeValue.trim()) params.append("ville", villeValue.trim());

      const response = await api.get(`/search/medecins?${params.toString()}`);
      setResults(response.data);
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchQuery, ville);
  };

  const handleSelectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    performSearch(suggestion.label, ville);
  };

  const handleSelectVille = (v) => {
    setVille(v);
    setShowVilleSuggestions(false);
    performSearch(searchQuery, v);
  };

  const suggestionIcon = (type) => {
    if (type === "specialite") return <Stethoscope className={styles.suggestionIcon} />;
    if (type === "hopital") return <Building2 className={styles.suggestionIcon} />;
    return <User className={styles.suggestionIcon} />;
  };

  const handleShowHoraires = (medecin) => {
    setSelectedMedecin(medecin);
    setShowHorairesModal(true);
  };

  const handleCloseHoraires = () => {
    setShowHorairesModal(false);
    setSelectedMedecin(null);
  };

  const handleShowHopital = async (hopital) => {
    setLoadingHopitalId(hopital.id);
    try {
      const res = await api.get(`/hopital/${hopital.id}/medecins`);
      setSelectedHopitalDetails(res.data);
      setShowHopitalModal(true);
    } catch (error) {
      console.error("Erreur lors du chargement de l'hôpital:", error);
    } finally {
      setLoadingHopitalId(null);
    }
  };

  const handleCloseHopital = () => {
    setShowHopitalModal(false);
    setSelectedHopitalDetails(null);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(true);

    if (value.trim() === "" && !ville.trim()) {
      setResults([]);
      setSearched(false);
    }
  };

  const handleVilleChange = (e) => {
    const value = e.target.value;
    setVille(value);
    setShowVilleSuggestions(true);

    if (value.trim() === "" && !searchQuery.trim()) {
      setResults([]);
      setSearched(false);
    }
  };

  const medecins = results.filter((r) => r.type === "medecin");
  const hopitaux = results.filter((r) => r.type === "hopital");

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h2 className={styles.heroTitle}>Trouvez votre médecin en quelques clics</h2>
          <p className={styles.heroSubtitle}>Recherchez par nom de médecin, hôpital ou par ville</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchContainer}>
              <div className={styles.searchField}>
                <Search className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Nom, spécialité, établissement..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={styles.searchInput}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className={styles.suggestionsList}>
                    {suggestions.map((s) => (
                      <li key={`${s.type}-${s.id}`}>
                        <button
                          type="button"
                          className={styles.suggestionItem}
                          onMouseDown={() => handleSelectSuggestion(s)}
                        >
                          {suggestionIcon(s.type)}
                          <span className={styles.suggestionLabel}>{s.label}</span>
                          {s.meta && <span className={styles.suggestionMeta}>{s.meta}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.searchDivider} />

              <div className={styles.searchField}>
                <MapPin className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Où ? (ville, optionnel)"
                  value={ville}
                  onChange={handleVilleChange}
                  onFocus={() => setShowVilleSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowVilleSuggestions(false), 150)}
                  className={styles.searchInput}
                  autoComplete="off"
                />
                {showVilleSuggestions && villeSuggestions.length > 0 && (
                  <ul className={styles.suggestionsList}>
                    {villeSuggestions.map((v) => (
                      <li key={v}>
                        <button
                          type="button"
                          className={styles.suggestionItem}
                          onMouseDown={() => handleSelectVille(v)}
                        >
                          <MapPin className={styles.suggestionIcon} />
                          <span className={styles.suggestionLabel}>{v}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" className={styles.searchButton} disabled={loading}>
                {loading ? "Recherche..." : "Rechercher"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <section className={styles.results}>
        <div className={styles.resultsContent}>
          {loading && (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Recherche en cours...</p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>🔍</div>
              <h3 className={styles.noResultsTitle}>Aucun résultat trouvé</h3>
              <p className={styles.noResultsText}>Essayez avec un autre nom ou une autre ville</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className={styles.resultsHeader}>
                <h3 className={styles.resultsTitle}>
                  {results.length} résultat{results.length > 1 ? "s" : ""} trouvé
                  {results.length > 1 ? "s" : ""}
                  {hopitaux.length > 0 && medecins.length > 0 && (
                    <span className={styles.resultsSubtitle}>
                      {` — ${hopitaux.length} hôpital${hopitaux.length > 1 ? "x" : ""}, ${medecins.length} médecin${medecins.length > 1 ? "s" : ""}`}
                    </span>
                  )}
                </h3>
              </div>

              <div className={styles.medecinGrid}>
                {/* Cartes hôpitaux */}
                {hopitaux.map((hopital) => (
                  <div key={`hopital-${hopital.id}`} className={styles.hopitalCard}>
                    <div className={styles.hopitalHeader}>
                      <div className={styles.hopitalAvatar}>
                        <Building2 className={styles.avatarIcon} />
                      </div>
                      <div className={styles.hopitalInfo}>
                        <h4 className={styles.hopitalName}>{hopital.name}</h4>
                        <p className={styles.hopitalVille}>
                          <MapPin className={styles.detailIconSmall} />
                          {hopital.ville}
                        </p>
                        {hopital.medecins_count > 0 && (
                          <p className={styles.hopitalMedecinsCount}>
                            {hopital.medecins_count} médecin{hopital.medecins_count > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={styles.medecinFooter}>
                      <button
                        onClick={() => handleShowHopital(hopital)}
                        className={styles.detailsButton}
                        disabled={loadingHopitalId === hopital.id}
                      >
                        {loadingHopitalId === hopital.id ? "Chargement..." : "Détails"}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cartes médecins */}
                {medecins.map((medecin) => (
                  <div key={`medecin-${medecin.id}`} className={styles.medecinCard}>
                    <div className={styles.medecinHeader}>
                      <div className={styles.medecinAvatar}>
                        {medecin.photo_url ? (
                          <img
                            src={medecin.photo_url}
                            alt={`Dr. ${medecin.name}`}
                            className={styles.medecinAvatarImg}
                          />
                        ) : (
                          <User className={styles.avatarIcon} />
                        )}
                      </div>
                      <div className={styles.medecinInfo}>
                        <h4 className={styles.medecinName}>Dr. {medecin.name}</h4>
                        <p className={styles.medecinSpecialite}>{medecin.specialite}</p>
                      </div>
                    </div>

                    <div className={styles.medecinBody}>
                      {medecin.description && (
                        <p className={styles.medecinDescription}>{medecin.description}</p>
                      )}

                      <div className={styles.medecinDetails}>
                        {medecin.ville && (
                          <div className={styles.detailItem}>
                            <MapPin className={styles.detailIcon} />
                            <span>{medecin.ville}</span>
                          </div>
                        )}

                        {medecin.adresse && (
                          <div className={styles.detailItem}>
                            <MapPin className={styles.detailIcon} />
                            <span>{medecin.adresse}</span>
                          </div>
                        )}

                        {medecin.telephone && (
                          <div className={styles.detailItem}>
                            <Phone className={styles.detailIcon} />
                            <span>{medecin.telephone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.medecinFooter}>
                      <button
                        onClick={() => handleShowHoraires(medecin)}
                        className={styles.appointmentButton}
                      >
                        Consulter les horaires
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!searched && !loading && (
            <div className={styles.placeholder}>
              <div className={styles.placeholderIcon}>🏥</div>
              <h3 className={styles.placeholderTitle}>Commencez votre recherche</h3>
              <p className={styles.placeholderText}>
                Entrez le nom d'un médecin, d'un hôpital ou d'une ville pour commencer
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modal des horaires */}
      {showHorairesModal && selectedMedecin && (
        <ModalHoraires medecin={selectedMedecin} onClose={handleCloseHoraires} />
      )}

      {/* Modal hôpital */}
      {showHopitalModal && selectedHopitalDetails && (
        <ModalHopital hopitalDetails={selectedHopitalDetails} onClose={handleCloseHopital} />
      )}
    </div>
  );
}
