<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Consultation;
use App\Models\ConsultationFacture;
use App\Models\ConsultationFactureLigne;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ConsultationService
{
    public function __construct(private RendezVousBookingService $bookings)
    {
    }

    public function demarrerRendezVous(MedecinProfile $profil, User $user, RendezVous $rendezVous): Consultation
    {
        return $this->verrouiller($profil, fn () => $this->creer($profil, $user, $rendezVous));
    }

    /** @param array{name: string, email?: ?string, phone?: ?string, motif?: ?string} $patient */
    public function demarrerRapide(MedecinProfile $profil, User $user, array $patient): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $patient) {
            $debut = now();

            $rendezVous = $this->bookings->createByMedecin($profil, $user, [
                'name' => $patient['name'],
                'email' => $patient['email'] ?? null,
                'phone' => $patient['phone'] ?? null,
                'motif' => $patient['motif'] ?? null,
                'date_debut' => $debut,
                'date_fin' => $debut->copy()->addMinutes(30),
                'statut' => 'confirmé',
            ]);

            return $this->creer($profil, $user, $rendezVous);
        });
    }

    public function mettreAJourHeureDebut(MedecinProfile $profil, User $user, int $id, Carbon $heure): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id, $heure) {
            $consultation = $this->enCours($profil, $id);
            $avant = $consultation->heure_debut_reelle;

            $consultation->update(['heure_debut_reelle' => $heure]);
            $this->journaliser($consultation, 'heure_debut_modifiee', $user, [
                'avant' => $avant?->toIso8601String(),
                'apres' => $heure->toIso8601String(),
            ]);

            return $this->charger($consultation);
        });
    }

    public function enregistrerOrdonnance(MedecinProfile $profil, User $user, int $id, ?string $texte): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id, $texte) {
            $consultation = $this->enCours($profil, $id);
            $consultation->update(['ordonnance_texte' => $texte]);
            $this->journaliser($consultation, 'ordonnance_enregistree', $user, ['longueur' => mb_strlen((string) $texte)]);

            return $this->charger($consultation);
        });
    }

    /** @param list<array{libelle: string, quantite: float|int|string, prix_unitaire: float|int|string}> $lignes */
    public function enregistrerFacture(MedecinProfile $profil, User $user, int $id, array $lignes): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id, $lignes) {
            $consultation = $this->enCours($profil, $id);

            $facture = ConsultationFacture::updateOrCreate(
                ['consultation_id' => $consultation->id],
                ['total' => 0]
            );
            ConsultationFactureLigne::where('consultation_facture_id', $facture->id)->delete();

            $total = 0.0;
            foreach (array_values($lignes) as $position => $ligne) {
                $montant = round((float) $ligne['quantite'] * (float) $ligne['prix_unitaire'], 2);
                $total += $montant;

                $facture->lignes()->create([
                    'libelle' => $ligne['libelle'],
                    'quantite' => $ligne['quantite'],
                    'prix_unitaire' => $ligne['prix_unitaire'],
                    'total' => $montant,
                    'position' => $position,
                ]);
            }

            $facture->update(['total' => round($total, 2)]);
            $this->journaliser($consultation, 'facture_enregistree', $user, [
                'total' => round($total, 2),
                'lignes' => count($lignes),
            ]);

            return $this->charger($consultation);
        });
    }

    public function abandonner(MedecinProfile $profil, User $user, int $id, string $motif): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id, $motif) {
            $consultation = $this->enCours($profil, $id);
            $consultation->update([
                'statut' => Consultation::ABANDONNEE,
                'abandoned_at' => now(),
                'abandon_motif' => $motif,
            ]);
            $this->journaliser($consultation, 'abandonnee', $user, ['motif' => $motif]);

            return $this->charger($consultation);
        });
    }

    public function reprendre(MedecinProfile $profil, User $user, int $id): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id) {
            $consultation = $this->consultationDuProfil($profil, $id);

            if ($consultation->statut !== Consultation::ABANDONNEE) {
                throw new BusinessException('Seule une consultation abandonnée peut être reprise.', 422);
            }

            $statutRdv = $consultation->rendezVous->statut;
            if (in_array($statutRdv, ['annulé', 'terminé'], true)) {
                throw new BusinessException("Le rendez-vous est {$statutRdv} : la consultation ne peut pas être reprise.", 422);
            }

            $this->exigerAucuneAutreEnCours($profil);

            $consultation->update(['statut' => Consultation::EN_COURS]);
            $this->journaliser($consultation, 'reprise', $user);

            return $this->charger($consultation);
        });
    }

    public function terminer(MedecinProfile $profil, User $user, int $id): Consultation
    {
        return $this->verrouiller($profil, function () use ($profil, $user, $id) {
            $consultation = $this->enCours($profil, $id);

            if (!$consultation->facture?->lignes()->exists()) {
                throw new BusinessException('Une facture comportant au moins une ligne est requise pour terminer la consultation.', 422);
            }

            $consultation->update([
                'statut' => Consultation::TERMINEE,
                'ended_at' => now(),
            ]);
            RendezVous::whereKey($consultation->rendez_vous_id)->update(['statut' => 'terminé']);
            $this->journaliser($consultation, 'terminee', $user);

            return $this->charger($consultation);
        });
    }

    public function formater(Consultation $c): array
    {
        $rdv = $c->rendezVous;
        $facture = $c->facture;

        return [
            'id' => $c->id,
            'statut' => $c->statut,
            'started_at' => $c->started_at,
            'heure_debut_reelle' => $c->heure_debut_reelle,
            'ended_at' => $c->ended_at,
            'abandoned_at' => $c->abandoned_at,
            'abandon_motif' => $c->abandon_motif,
            'ordonnance_texte' => $c->ordonnance_texte,
            'rendez_vous' => [
                'id' => $rdv->id,
                'date_debut' => $rdv->date_debut,
                'date_fin' => $rdv->date_fin,
                'motif' => $rdv->motif,
                'statut' => $rdv->statut,
            ],
            'patient' => [
                'nom' => $rdv->name,
                'email' => $rdv->email,
                'telephone' => $rdv->phone,
                'client_id' => $rdv->client_id,
            ],
            'facture' => $facture ? [
                'total' => $facture->total,
                'lignes' => $facture->lignes->map(fn (ConsultationFactureLigne $l) => [
                    'libelle' => $l->libelle,
                    'quantite' => $l->quantite,
                    'prix_unitaire' => $l->prix_unitaire,
                    'total' => $l->total,
                ])->values(),
            ] : null,
            'documents' => $c->documents->map(fn ($d) => [
                'id' => $d->id,
                'type' => $d->type,
                'titre' => $d->titre,
                'created_at' => $d->created_at,
            ])->values(),
        ];
    }

    // Consultations du même patient (email normalisé ou compte lié) pour ce seul médecin.
    public function historiquePatient(MedecinProfile $profil, Consultation $consultation): Collection
    {
        $rdv = $consultation->rendezVous;
        $email = $rdv->email ? mb_strtolower(trim($rdv->email)) : null;

        return Consultation::where('medecin_profile_id', $profil->id)
            ->whereHas('rendezVous', function ($q) use ($rdv, $email) {
                $q->where(function ($q) use ($rdv, $email) {
                    $q->where('rendez_vous.id', $rdv->id);

                    if ($email) {
                        $q->orWhereRaw('LOWER(rendez_vous.email) = ?', [$email]);
                    }

                    if ($rdv->client_id) {
                        $q->orWhere('rendez_vous.client_id', $rdv->client_id);
                    }
                });
            })
            ->with(['rendezVous', 'facture.lignes', 'documents'])
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (Consultation $c) => $this->formater($c))
            ->values();
    }

    // Antécédents cochés par le compte client lié au rendez-vous ; null sans compte lié.
    public function antecedentsPatient(Consultation $consultation): ?array
    {
        $client = $consultation->rendezVous->client;

        if (!$client) {
            return null;
        }

        return [
            'commentaire' => $client->antecedents_commentaire,
            'categories' => $client->antecedentOptions()
                ->orderBy('antecedent_options.id')
                ->get()
                ->groupBy('categorie')
                ->map(fn ($items, $categorie) => [
                    'categorie' => $categorie,
                    'libelles' => $items->pluck('libelle')->values(),
                ])
                ->values(),
        ];
    }

    private function verrouiller(MedecinProfile $profil, callable $action): mixed
    {
        return DB::transaction(function () use ($profil, $action) {
            MedecinProfile::whereKey($profil->id)->lockForUpdate()->firstOrFail();

            return $action();
        });
    }

    private function creer(MedecinProfile $profil, User $user, RendezVous $rendezVous): Consultation
    {
        if ($rendezVous->medecin_id !== $profil->id) {
            throw new BusinessException('Rendez-vous introuvable.', 404);
        }

        if (in_array($rendezVous->statut, ['annulé', 'terminé'], true)) {
            throw new BusinessException("Ce rendez-vous ne peut pas être démarré (statut : {$rendezVous->statut}).", 422);
        }

        $this->exigerAucuneAutreEnCours($profil);

        $existante = Consultation::where('rendez_vous_id', $rendezVous->id)->first();
        if ($existante) {
            throw new BusinessException(
                "Une consultation existe déjà pour ce rendez-vous (statut : {$existante->statut}).",
                409,
                ['consultation_id' => $existante->id]
            );
        }

        try {
            $consultation = Consultation::create([
                'medecin_profile_id' => $profil->id,
                'rendez_vous_id' => $rendezVous->id,
                'statut' => Consultation::EN_COURS,
                'started_at' => now(),
                'heure_debut_reelle' => now(),
            ]);
        } catch (QueryException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw new BusinessException('Une consultation est déjà en cours ou existe pour ce rendez-vous.', 409);
            }

            throw $e;
        }

        $this->journaliser($consultation, 'demarree', $user);

        return $this->charger($consultation);
    }

    private function exigerAucuneAutreEnCours(MedecinProfile $profil): void
    {
        $enCours = Consultation::where('medecin_profile_id', $profil->id)
            ->where('statut', Consultation::EN_COURS)
            ->first();

        if ($enCours) {
            throw new BusinessException(
                "Une consultation est déjà en cours. Terminez-la ou abandonnez-la avant d'en démarrer une autre.",
                409,
                ['consultation_id' => $enCours->id]
            );
        }
    }

    private function enCours(MedecinProfile $profil, int $id): Consultation
    {
        $consultation = $this->consultationDuProfil($profil, $id);

        if ($consultation->statut !== Consultation::EN_COURS) {
            throw new BusinessException("Cette consultation n'est plus en cours.", 422);
        }

        return $consultation;
    }

    private function consultationDuProfil(MedecinProfile $profil, int $id): Consultation
    {
        return Consultation::where('medecin_profile_id', $profil->id)
            ->with(['rendezVous', 'facture.lignes', 'documents'])
            ->findOrFail($id);
    }

    private function charger(Consultation $consultation): Consultation
    {
        return $consultation->fresh(['rendezVous', 'facture.lignes', 'documents']);
    }

    private function journaliser(Consultation $consultation, string $type, User $user, array $payload = []): void
    {
        $consultation->events()->create([
            'user_id' => $user->id,
            'type' => $type,
            'payload' => $payload ?: null,
        ]);
    }
}
