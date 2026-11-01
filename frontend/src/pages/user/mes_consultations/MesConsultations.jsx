import { useContext, useEffect, useState } from "react";
import { Download, Stethoscope } from "lucide-react";
import { AuthContext } from "../../../context/AuthContext";
import { clientDossierApi } from "../../../api/clientDossierApi";
import UserNavbar from "../components/UserNavbar";
import {
  STATUT_CONSULTATION_LABELS,
  STATUT_RENDEZ_VOUS_LABELS,
  formatDateHeure,
  formatMontant,
  telechargerDocument,
} from "../utils/clientDossier";
import styles from "./MesConsultations.module.css";

const BADGE_STATUT = {
  en_cours: styles.badgeEnCours,
  terminee: styles.badgeTerminee,
  abandonnee: styles.badgeAbandonnee,
};

// Le premier document du type est le plus récent (tri fait côté API).
const BoutonTelechargerPdf = ({ documents, type }) => {
  const pdf = documents.find((doc) => doc.type === type);

  if (!pdf) return null;

  return (
    <button type="button" className={styles.downloadButton} onClick={() => telechargerDocument(pdf)}>
      <Download size={16} />
      Télécharger le PDF
    </button>
  );
};

const MesConsultations = () => {
  const { user } = useContext(AuthContext);
  const [consultations, setConsultations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!user) return;

    let actif = true;

    clientDossierApi
      .listConsultations()
      .then((liste) => {
        if (actif) setConsultations(liste);
      })
      .catch(() => {
        if (actif) setErreur("Impossible de charger vos consultations");
      })
      .finally(() => {
        if (actif) setChargement(false);
      });

    return () => {
      actif = false;
    };
  }, [user]);

  return (
    <div className={styles.container}>
      <UserNavbar />

      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Mes Consultations</h1>
          <p className={styles.subtitle}>
            Vos consultations avec les rendez-vous, ordonnances, factures et documents associés
          </p>

          {erreur && <p className={styles.error}>{erreur}</p>}
          {chargement && <p className={styles.empty}>Chargement des consultations...</p>}

          {!chargement && !erreur && consultations.length === 0 && (
            <div className={styles.empty}>
              <Stethoscope size={48} className={styles.emptyIcon} />
              <p>Aucune consultation pour le moment.</p>
            </div>
          )}

          <div className={styles.list}>
            {consultations.map((c) => (
              <article key={c.id} className={styles.card}>
                <header className={styles.cardHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>{formatDateHeure(c.rendez_vous.date_debut)}</h2>
                    <p className={styles.cardSubtitle}>
                      {c.medecin?.name ? `Dr. ${c.medecin.name}` : "Médecin non renseigné"}
                      {c.medecin?.specialite && ` - ${c.medecin.specialite}`}
                    </p>
                  </div>
                  <span className={`${styles.badge} ${BADGE_STATUT[c.statut] ?? ""}`}>
                    {STATUT_CONSULTATION_LABELS[c.statut] ?? c.statut}
                  </span>
                </header>

                <div className={styles.body}>
                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Rendez-vous</h3>
                    <dl className={styles.infos}>
                      <dt>Motif</dt>
                      <dd>{c.rendez_vous.motif || "—"}</dd>
                      <dt>Statut</dt>
                      <dd>{STATUT_RENDEZ_VOUS_LABELS[c.rendez_vous.statut] ?? c.rendez_vous.statut}</dd>
                      {c.medecin?.hopital && (
                        <>
                          <dt>Établissement</dt>
                          <dd>
                            {c.medecin.hopital.name}
                            {c.medecin.hopital.adresse && `, ${c.medecin.hopital.adresse}`}
                          </dd>
                        </>
                      )}
                      {c.rendez_vous.notes && (
                        <>
                          <dt>Notes</dt>
                          <dd>{c.rendez_vous.notes}</dd>
                        </>
                      )}
                    </dl>
                  </section>

                  <section className={styles.section}>
                    <h3 className={styles.sectionTitle}>Consultation</h3>
                    <dl className={styles.infos}>
                      <dt>Début</dt>
                      <dd>{formatDateHeure(c.heure_debut_reelle)}</dd>
                      <dt>Fin</dt>
                      <dd>{formatDateHeure(c.ended_at)}</dd>
                    </dl>
                  </section>

                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>Ordonnance</h3>
                      <BoutonTelechargerPdf documents={c.documents} type="ordonnance" />
                    </div>
                    {c.ordonnance_texte ? (
                      <pre className={styles.texte}>{c.ordonnance_texte}</pre>
                    ) : (
                      <p className={styles.muted}>Aucune ordonnance rédigée.</p>
                    )}
                  </section>

                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>Facture</h3>
                      <BoutonTelechargerPdf documents={c.documents} type="facture" />
                    </div>
                    {c.facture ? (
                      <>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Libellé</th>
                              <th>Qté</th>
                              <th>Prix unitaire</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.facture.lignes.map((ligne, index) => (
                              <tr key={`${ligne.libelle}-${index}`}>
                                <td>{ligne.libelle}</td>
                                <td>{Number(ligne.quantite)}</td>
                                <td>{formatMontant(ligne.prix_unitaire)}</td>
                                <td>{formatMontant(ligne.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className={styles.total}>Total : {formatMontant(c.facture.total)}</p>
                      </>
                    ) : (
                      <p className={styles.muted}>Aucune facture.</p>
                    )}
                  </section>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MesConsultations;
