import { useState } from "react";
import { toast } from "react-toastify";
import { formatMontant } from "./consultationFormat";
import styles from "./Consultations.module.css";

const ligneVide = () => ({ libelle: "", quantite: "1", prix_unitaire: "" });

const versLignesEditables = (lignes) =>
  lignes.length
    ? lignes.map((l) => ({
        libelle: l.libelle,
        quantite: String(l.quantite),
        prix_unitaire: String(l.prix_unitaire),
      }))
    : [ligneVide()];

const totalLigne = (ligne) => (Number(ligne.quantite) || 0) * (Number(ligne.prix_unitaire) || 0);

const FactureEditor = ({ lignesInitiales, readOnly = false, saving = false, onSave, onApercu = null, apercuDisabled = false }) => {
  const [lignes, setLignes] = useState(() => versLignesEditables(lignesInitiales));
  const total = lignes.reduce((somme, ligne) => somme + totalLigne(ligne), 0);

  const modifier = (index, champ, valeur) =>
    setLignes((prev) => prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));

  const enregistrer = () => {
    const valides = lignes.every(
      (ligne) =>
        ligne.libelle.trim() &&
        Number(ligne.quantite) > 0 &&
        ligne.prix_unitaire.trim() !== "" &&
        Number(ligne.prix_unitaire) >= 0
    );

    if (!valides) {
      toast.error("Chaque ligne doit avoir un libellé, une quantité supérieure à 0 et un prix");
      return;
    }

    onSave(
      lignes.map((ligne) => ({
        libelle: ligne.libelle.trim(),
        quantite: Number(ligne.quantite),
        prix_unitaire: Number(ligne.prix_unitaire),
      }))
    );
  };

  return (
    <div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Qté</th>
              <th>Prix unit.</th>
              <th>Total</th>
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
                    min="0.01"
                    step="0.01"
                    value={ligne.quantite}
                    disabled={readOnly}
                    onChange={(event) => modifier(index, "quantite", event.target.value)}
                  />
                </td>
                <td>
                  <input
                    className={styles.lineInput}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ligne.prix_unitaire}
                    disabled={readOnly}
                    onChange={(event) => modifier(index, "prix_unitaire", event.target.value)}
                  />
                </td>
                <td>{formatMontant(totalLigne(ligne))}</td>
                {!readOnly && (
                  <td>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.secondary}`}
                      disabled={lignes.length === 1}
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

      <p className={styles.total}>Total : {formatMontant(total)}</p>

      <div className={styles.actions}>
        {!readOnly && (
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            onClick={() => setLignes((prev) => [...prev, ligneVide()])}
          >
            Ajouter une ligne
          </button>
        )}
        {onApercu && (
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={onApercu} disabled={apercuDisabled}>
            Aperçu facture
          </button>
        )}
        {!readOnly && (
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={enregistrer} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer la facture"}
          </button>
        )}
      </div>
    </div>
  );
};

export default FactureEditor;
