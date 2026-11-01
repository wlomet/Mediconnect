import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import NavbarMedecin from "../components/NavbarMedecin";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { consultationApi, extraireErreur } from "../../../api/consultationApi";
import FactureEditor from "./FactureEditor";
import ModalAbandonConsultation from "./ModalAbandonConsultation";
import ModalApercu from "./ModalApercu";
import {
  JOURNAL_LABELS,
  STATUT_LABELS,
  formatDateHeure,
  versValeurDateLocale,
} from "./consultationFormat";
import styles from "./Consultations.module.css";

const BADGE_STATUT = {
  en_cours: styles.badgeEnCours,
  abandonnee: styles.badgeAbandonnee,
  terminee: styles.badgeTerminee,
};

const ConsultationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [heure, setHeure] = useState("");
  const [texte, setTexte] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [conflitId, setConflitId] = useState(null);
  const [abandonOuvert, setAbandonOuvert] = useState(false);
  const [confirmTerminer, setConfirmTerminer] = useState(false);
  const [apercu, setApercu] = useState(null);

  const chargerConsultation = useCallback(async () => {
    const result = await consultationApi.show(id);
    setData(result);
    setHeure(versValeurDateLocale(result.consultation.heure_debut_reelle));
    setTexte(result.consultation.ordonnance_texte ?? "");
  }, [id]);

  useEffect(() => {
    chargerConsultation()
      .catch((error) => setErreur(extraireErreur(error, "Consultation introuvable").message))
      .finally(() => setChargement(false));
  }, [chargerConsultation]);

  const executer = async (action, messageSucces) => {
    setOccupe(true);
    setConflitId(null);
    try {
      await action();
      if (messageSucces) toast.success(messageSucces);
      await chargerConsultation();
      return true;
    } catch (error) {
      const { message, consultationId } = extraireErreur(error);
      toast.error(message);
      setConflitId(consultationId);
      return false;
    } finally {
      setOccupe(false);
    }
  };

  if (chargement) {
    return (
      <div className={styles.page}>
        <NavbarMedecin />
        <main className={styles.container}>
          <p className={styles.empty}>Chargement de la consultation...</p>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <NavbarMedecin />
        <main className={styles.container}>
          <p className={styles.error}>{erreur || "Consultation introuvable"}</p>
          <Link to="/medecin/consultations" className={styles.link}>Retour aux consultations</Link>
        </main>
      </div>
    );
  }

  const { consultation: c, historique, journal, antecedents } = data;
  const enCours = c.statut === "en_cours";
  const peutTerminer = enCours && Boolean(c.facture?.lignes?.length);
  const heureModifiee = heure !== versValeurDateLocale(c.heure_debut_reelle);

  const enregistrerHeure = () =>
    executer(() => consultationApi.updateHeureDebut(c.id, new Date(heure).toISOString()), "Heure de début enregistrée");

  const enregistrerOrdonnance = () =>
    executer(() => consultationApi.saveOrdonnance(c.id, texte.trim() || null), "Ordonnance enregistrée");

  const enregistrerFacture = (lignes) =>
    executer(() => consultationApi.saveFacture(c.id, lignes), "Facture enregistrée");

  const abandonner = async (motif) => {
    const ok = await executer(() => consultationApi.abandonner(c.id, motif), "Consultation abandonnée");
    if (ok) setAbandonOuvert(false);
  };

  const reprendre = () => executer(() => consultationApi.reprendre(c.id), "Consultation reprise");

  const terminer = async () => {
    setConfirmTerminer(false);
    const ok = await executer(() => consultationApi.terminer(c.id), "Consultation terminée");
    if (ok) navigate("/dashboard");
  };

  return (
    <div className={styles.page}>
      <NavbarMedecin />

      <main className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Consultation de {c.patient.nom || "patient"}{" "}
              <span className={`${styles.badge} ${BADGE_STATUT[c.statut]}`}>{STATUT_LABELS[c.statut]}</span>
            </h1>
            <p className={styles.subtitle}>
              Démarrée le {formatDateHeure(c.started_at)}
              {c.ended_at && ` · Terminée le ${formatDateHeure(c.ended_at)}`}
            </p>
          </div>

          <div className={styles.headerActions}>
            {enCours && (
              <>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={() => setAbandonOuvert(true)}
                  disabled={occupe}
                >
                  Abandonner
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.success}`}
                  onClick={() => setConfirmTerminer(true)}
                  disabled={occupe || !peutTerminer}
                  title={peutTerminer ? "" : "Une facture avec au moins une ligne est requise"}
                >
                  Terminer la consultation
                </button>
              </>
            )}
            {c.statut === "abandonnee" && (
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={reprendre} disabled={occupe}>
                Reprendre la consultation
              </button>
            )}
          </div>
        </header>

        {c.statut === "abandonnee" && (
          <div className={`${styles.banner} ${styles.bannerWarning}`}>
            Consultation abandonnée le {formatDateHeure(c.abandoned_at)}. Motif : {c.abandon_motif}
          </div>
        )}
        {c.statut === "terminee" && (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>
            Consultation terminée. Les informations sont en lecture seule.
          </div>
        )}
        {conflitId && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            Une autre consultation est en cours.{" "}
            <button type="button" className={styles.link} onClick={() => navigate(`/medecin/consultations/${conflitId}`)}>
              Ouvrir la consultation en cours
            </button>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.stack}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Patient</h2>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nom</span>
                <span className={styles.infoValue}>{c.patient.nom}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{c.patient.email || "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Téléphone</span>
                <span className={styles.infoValue}>{c.patient.telephone || "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Compte patient</span>
                <span className={styles.infoValue}>{c.patient.client_id ? "Lié" : "Non lié"}</span>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Antécédents</h2>
              {!antecedents && (
                <p className={styles.small}>Ce patient n'a pas de compte lié : antécédents indisponibles.</p>
              )}
              {antecedents && antecedents.categories.length === 0 && !antecedents.commentaire && (
                <p className={styles.small}>Aucun antécédent renseigné par le patient.</p>
              )}
              {antecedents?.categories.map((cat) => (
                <div key={cat.categorie} className={styles.infoRow}>
                  <span className={styles.infoLabel}>{cat.categorie}</span>
                  <span className={styles.infoValue}>{cat.libelles.join(", ")}</span>
                </div>
              ))}
              {antecedents?.commentaire && (
                <div className={styles.field}>
                  <span className={styles.label}>Commentaire du patient</span>
                  <p className={styles.texteLibre}>{antecedents.commentaire}</p>
                </div>
              )}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Historique avec ce patient</h2>
              <p className={styles.small}>Consultations réalisées par vous uniquement.</p>
              <ul className={styles.list}>
                {historique.map((h) => (
                  <li key={h.id} className={`${styles.listItem} ${h.id === c.id ? styles.listItemCurrent : ""}`}>
                    <span>
                      {formatDateHeure(h.heure_debut_reelle)} · {h.rendez_vous.motif}
                    </span>
                    {h.id === c.id ? (
                      <span className={styles.small}>Actuelle</span>
                    ) : (
                      <Link to={`/medecin/consultations/${h.id}`} className={styles.link}>
                        Voir
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Journal</h2>
              <ul className={styles.list}>
                {journal.map((j, index) => (
                  <li key={index} className={styles.listItem}>
                    <span>{JOURNAL_LABELS[j.type] ?? j.type}</span>
                    <span className={styles.small}>
                      {formatDateHeure(j.created_at)}
                      {j.user && ` · ${j.user}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className={styles.stack}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Rendez-vous</h2>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Date prévue</span>
                <span className={styles.infoValue}>{formatDateHeure(c.rendez_vous.date_debut)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Fin prévue</span>
                <span className={styles.infoValue}>{formatDateHeure(c.rendez_vous.date_fin)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Motif</span>
                <span className={styles.infoValue}>{c.rendez_vous.motif}</span>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Heure réelle de début</h2>
              <div className={styles.field}>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={heure}
                  max={versValeurDateLocale(new Date().toISOString())}
                  disabled={!enCours || occupe}
                  onChange={(event) => setHeure(event.target.value)}
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={enregistrerHeure}
                  disabled={!enCours || !heureModifiee || !heure || occupe}
                >
                  Enregistrer l'heure
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Ordonnance</h2>
              <div className={styles.field}>
                <textarea
                  className={styles.textarea}
                  value={texte}
                  disabled={!enCours || occupe}
                  placeholder="Rédigez l'ordonnance..."
                  onChange={(event) => setTexte(event.target.value)}
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondary}`}
                  onClick={() => setApercu("ordonnance")}
                  disabled={!c.ordonnance_texte}
                >
                  Aperçu ordonnance
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={enregistrerOrdonnance}
                  disabled={!enCours || occupe}
                >
                  Enregistrer l'ordonnance
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Facture</h2>
              <FactureEditor
                key={c.id}
                lignesInitiales={c.facture?.lignes ?? []}
                readOnly={!enCours}
                saving={occupe}
                onSave={enregistrerFacture}
                onApercu={() => setApercu("facture")}
                apercuDisabled={!c.facture?.lignes?.length}
              />
            </section>
          </div>
        </div>
      </main>

      {apercu && (
        <ModalApercu
          type={apercu}
          rendezVousId={c.rendez_vous.id}
          texte={c.ordonnance_texte}
          lignes={c.facture?.lignes}
          onClose={() => setApercu(null)}
        />
      )}

      {abandonOuvert && (
        <ModalAbandonConsultation busy={occupe} onClose={() => setAbandonOuvert(false)} onConfirm={abandonner} />
      )}

      <ConfirmDialog
        open={confirmTerminer}
        title="Terminer la consultation ?"
        message="La consultation sera marquée comme terminée et le rendez-vous passera au statut terminé."
        confirmLabel="Terminer"
        cancelLabel="Annuler"
        onConfirm={terminer}
        onCancel={() => setConfirmTerminer(false)}
      />
    </div>
  );
};

export default ConsultationPage;
