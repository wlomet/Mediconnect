import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { superAdminApi } from "../../../api/superAdminApi";
import styles from "../../medecin/pdf-templates/PdfTemplatesList.module.css";

/**
 * Choix du propriétaire d'un modèle ou d'un logo : établissement ou médecin.
 * @param {{type: "hopital"|"medecin", id: string}} value
 * @param {(value: {type: string, id: string}) => void} onChange
 */
export default function OwnerSelect({ value, onChange }) {
  const [acteurs, setActeurs] = useState({ hopitaux: [], medecins: [] });

  useEffect(() => {
    superAdminApi
      .listActeurs()
      .then(setActeurs)
      .catch(() => toast.error("Impossible de charger les établissements et médecins"));
  }, []);

  const elements = value.type === "hopital" ? acteurs.hopitaux : acteurs.medecins;

  return (
    <>
      <label className={styles.label}>
        Attribué à
        <select
          className={styles.input}
          value={value.type}
          onChange={(e) => onChange({ type: e.target.value, id: "" })}
        >
          <option value="hopital">Un établissement</option>
          <option value="medecin">Un médecin</option>
        </select>
      </label>

      <label className={styles.label}>
        {value.type === "hopital" ? "Établissement" : "Médecin"}
        <select
          className={styles.input}
          value={value.id}
          onChange={(e) => onChange({ ...value, id: e.target.value })}
        >
          <option value="">-- Choisir --</option>
          {elements.map((element) => (
            <option key={element.id} value={element.id}>
              {element.name}
              {element.hopital ? ` (${element.hopital})` : ""}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
