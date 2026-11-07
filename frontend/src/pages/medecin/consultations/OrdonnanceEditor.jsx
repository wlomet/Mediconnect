import { useState } from "react";
import { toast } from "react-toastify";
import { PRISE_OPTIONS } from "./consultationFormat";
import styles from "./Consultations.module.css";

const ligneVide = () => ({ libelle: "", quantite: "1", prise: "" });

const versLignesEditables = (lignes) =>
  lignes.map((ligne) => ({
    libelle: ligne.libelle,
    quantite: String(ligne.quantite),
    prise: ligne.prise,
  }));

const quantiteValide = (valeur) => Number.isInteger(Number(valeur)) && Number(valeur) >= 1;

const OrdonnanceEditor = ({
  lignesInitiales,
  commentaireInitial = "",
  readOnly = false,
  saving = false,
  onSave,
  onApercu = null,
  apercuDisabled = false,
}) => {
  const [lignes, setLignes] = useState(() => versLignesEditables(lignesInitiales));
  const [commentaire, setCommentaire] = useState(commentaireInitial);

  const modifier = (index, champ, valeur) =>
    setLignes((prev) => prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));

  const enregistrer = () => {
    const valides = lignes.every(
      (ligne) => ligne.libelle.trim() && quantiteValide(ligne.quantite) && ligne.prise
    );

    if (!valides) {
      toast.error("Chaque médicament doit avoir un libellé, une quantité supérieure à 0 et une prise");
      return;
    }

    onSave({
      lignes: lignes.map((ligne) => ({
        libelle: ligne.libelle.trim(),
        quantite: Number(ligne.quantite),
        prise: ligne.prise,
      })),
      commentaire: commentaire.trim() || null,
    });
  };

  return (
    <div>
      {lignes.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Médicament</th>
                <th>Qté</th>
                <th>Prise</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, index) => (
                <tr key={index}>
                  <td>
                    <input
                      className={styles.lineInput}
                      value={ligne.libelle}
                      disabled={readOnly}
                      onChange={(event) => modifier(index, "libelle", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.lineInput}
                      type="number"
                      min="1"
                      step="1"
                      value={ligne.quantite}
                      disabled={readOnly}
                      onChange={(event) => modifier(index, "quantite", event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className={styles.lineInput}
                      value={ligne.prise}
                      disabled={readOnly}
                      onChange={(event) => modifier(index, "prise", event.target.value)}
                    >
                      <option value="">Choisir...</option>
                      {PRISE_OPTIONS.map((option) => (
                        <option key={option.valeur} value={option.valeur}>
                          {option.libelle}
                        </option>
                      ))}
                    </select>
                  </td>
                  {!readOnly && (
                    <td>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={() => setLignes((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Retirer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.small}>Aucun médicament ajouté.</p>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Commentaire</span>
        <textarea
          className={styles.textarea}
          value={commentaire}
          disabled={readOnly}
          placeholder="Recommandations pour le patient..."
          onChange={(event) => setCommentaire(event.target.value)}
        />
      </div>

      <div className={styles.actions}>
        {!readOnly && (
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => setLignes((prev) => [...prev, ligneVide()])}
          >
            Ajouter un médicament
          </button>
        )}
        {onApercu && (
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onApercu} disabled={apercuDisabled}>
            Aperçu ordonnance
          </button>
        )}
        {!readOnly && (
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={enregistrer} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer l'ordonnance"}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrdonnanceEditor;
