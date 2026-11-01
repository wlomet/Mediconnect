import { useContext, useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { AuthContext } from "../../../context/AuthContext";
import { clientDossierApi } from "../../../api/clientDossierApi";
import UserNavbar from "../components/UserNavbar";
import { TYPE_DOCUMENT_LABELS, formatDateHeure, telechargerDocument } from "../utils/clientDossier";
import styles from "./MesDocuments.module.css";

const FILTRES = [
  { valeur: "", libelle: "Tous" },
  { valeur: "ordonnance", libelle: "Ordonnances" },
  { valeur: "facture", libelle: "Factures" },
];

const MesDocuments = () => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("");

  useEffect(() => {
    if (!user) return;

    let actif = true;

    clientDossierApi
      .listDocuments()
      .then((liste) => {
        if (actif) setDocuments(liste);
        clientDossierApi
          .marquerDocumentsVus()
          .catch((error) => console.error("Marquage des documents comme vus impossible:", error));
      })
      .catch(() => {
        if (actif) setErreur("Impossible de charger vos documents");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });

    return () => {
      actif = false;
    };
  }, [user]);

  const compter = (valeur) =>
    valeur ? documents.filter((doc) => doc.type === valeur).length : documents.length;

  const documentsAffiches = filtre ? documents.filter((doc) => doc.type === filtre) : documents;

  return (
    <div className={styles.container}>
      <UserNavbar />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Mes Documents</h1>
          <p className={styles.subtitle}>Ordonnances et factures archivées lors de vos rendez-vous</p>

          <div className={styles.tabs}>
            {FILTRES.map((f) => (
              <button
                key={f.valeur || "tous"}
                type="button"
                className={`${styles.tab} ${filtre === f.valeur ? styles.tabActive : ""}`}
                onClick={() => setFiltre(f.valeur)}
              >
                {f.libelle} ({compter(f.valeur)})
              </button>
            ))}
          </div>

          {erreur && <p className={styles.error}>{erreur}</p>}
          {chargement && <p className={styles.empty}>Chargement des documents...</p>}

          {!chargement && !erreur && documentsAffiches.length === 0 && (
            <div className={styles.empty}>
              <FileText size={48} className={styles.emptyIcon} />
              <p>{filtre ? "Aucun document pour ce filtre." : "Aucun document pour le moment."}</p>
            </div>
          )}

          {!chargement && documentsAffiches.length > 0 && (
            <ul className={styles.list}>
              {documentsAffiches.map((doc) => (
                <li key={doc.id} className={styles.item}>
                  <div className={styles.info}>
                    <div className={styles.titreLigne}>
                      <FileText size={20} className={styles.icon} />
                      <span className={styles.titre}>{doc.titre}</span>
                      <span
                        className={`${styles.badge} ${
                          doc.type === "facture" ? styles.badgeFacture : styles.badgeOrdonnance
                        }`}
                      >
                        {TYPE_DOCUMENT_LABELS[doc.type] ?? doc.type}
                      </span>
                    </div>
                    <span className={styles.meta}>
                      Rendez-vous du {formatDateHeure(doc.rendez_vous.date_debut)}
                      {doc.rendez_vous.motif && ` - ${doc.rendez_vous.motif}`}
                    </span>
                    <span className={styles.meta}>
                      {doc.medecin ? `Dr. ${doc.medecin}` : "Médecin non renseigné"} - Archivé le{" "}
                      {formatDateHeure(doc.created_at)}
                    </span>
                  </div>
                  <button type="button" className={styles.downloadButton} onClick={() => telechargerDocument(doc)}>
                    <Download size={16} />
                    Télécharger
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default MesDocuments;
