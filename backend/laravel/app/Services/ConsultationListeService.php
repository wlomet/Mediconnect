<?php

namespace App\Services;

use App\Models\Consultation;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

// Consultations des médecins donnés (tableau DataTables et export), en lecture seule
class ConsultationListeService
{
    // Filtres, pagination et tri envoyés par le tableau et par le panneau d'export
    public const REGLES = [
        'statut' => ['nullable', 'in:en_cours,en_attente,abandonnee,terminee'],
        'medecin_id' => ['nullable', 'integer'],
        'from' => ['nullable', 'date_format:Y-m-d', 'required_with:to'],
        'to' => ['nullable', 'date_format:Y-m-d', 'required_with:from', 'after_or_equal:from'],
        'timezone' => ['nullable', 'timezone:all'],
        'draw' => ['nullable', 'integer'],
        'start' => ['nullable', 'integer', 'min:0'],
        'length' => ['nullable', 'integer', 'between:1,100'],
        'search.value' => ['nullable', 'string', 'max:255'],
        'order.0.column' => ['nullable', 'integer', 'between:0,8'],
        'order.0.dir' => ['nullable', 'in:asc,desc'],
    ];

    // Colonnes du tableau dans l'ordre affiché ; null = non triable
    private const TRI = [
        0 => 'consultations.created_at',
        1 => 'users.name',
        2 => 'rendez_vous.name',
        3 => 'rendez_vous.date_debut',
        4 => 'consultations.heure_debut_reelle',
        5 => 'consultations.ended_at',
        6 => null,
        7 => null,
        8 => 'consultations.statut',
    ];

    private const STATUT_LIBELLES = [
        Consultation::EN_COURS => 'En cours',
        Consultation::EN_ATTENTE => 'En attente',
        Consultation::ABANDONNEE => 'Abandonnée',
        Consultation::TERMINEE => 'Terminée',
    ];

    private const RELATIONS = ['rendezVous', 'medecin.user', 'medecin.specialite', 'facture.lignes'];

    public function tableau(array $profilIds, array $donnees): array
    {
        $base = $this->requete($profilIds, $donnees);
        $recordsTotal = (clone $base)->count();
        $filtrees = $this->rechercher(clone $base, $donnees['search']['value'] ?? '');
        [$colonne, $sens] = $this->tri($donnees);

        $consultations = (clone $filtrees)
            ->orderBy($colonne, $sens)
            ->orderByDesc('consultations.id')
            ->offset((int) ($donnees['start'] ?? 0))
            ->limit((int) ($donnees['length'] ?? 10))
            ->with(self::RELATIONS)
            ->get();

        return [
            'draw' => (int) ($donnees['draw'] ?? 0),
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => (clone $filtrees)->count(),
            'data' => $consultations->map(fn (Consultation $c) => $this->formater($c))->values(),
        ];
    }

    // Entêtes et lignes de l'export, triées comme le tableau
    public function export(array $profilIds, array $donnees): array
    {
        $fuseau = $donnees['timezone'] ?? config('app.timezone');
        $heure = fn (?Carbon $date) => $date?->copy()->setTimezone($fuseau)->format('d/m/Y H:i');

        $consultations = $this->requete($profilIds, $donnees)
            ->with(self::RELATIONS)
            ->orderByDesc('consultations.created_at')
            ->orderByDesc('consultations.id')
            ->get();

        $datePeriode = isset($donnees['from']) ? "{$donnees['from']}_{$donnees['to']}" : now()->format('Y-m-d');

        return [
            'nom_base' => 'consultations_'.($donnees['statut'] ?? 'toutes').'_'.$datePeriode,
            'entetes' => ['Médecin', 'Spécialité', 'Patient', 'Date de création', 'Date du rendez-vous', 'Début de consultation', 'Fin de consultation', 'Statut de consultation', 'Ordonnance', 'Montant facture (XOF)'],
            'lignes' => $consultations->map(fn (Consultation $c) => [
                $c->medecin->user->name,
                $c->medecin->specialite?->nom ?? 'Non spécifié',
                $c->rendezVous->name,
                $heure($c->created_at),
                $heure($c->rendezVous->date_debut),
                $heure($c->heure_debut_reelle),
                $heure($c->ended_at),
                self::STATUT_LIBELLES[$c->statut],
                $this->libelleOrdonnance($c),
                $c->facture ? number_format((float) $c->facture->total, 2, ',', '') : ($c->decisionFacture() === Consultation::NON_GENEREE ? 'Sans facture' : null),
            ])->values()->all(),
        ];
    }

    // Filtres statut et période (bornes incluses, dans le fuseau de l'utilisateur) ; pas de contenu médical
    private function requete(array $profilIds, array $donnees): Builder
    {
        $requete = Consultation::query()
            ->select('consultations.*')
            ->join('medecin_profiles', 'medecin_profiles.id', '=', 'consultations.medecin_profile_id')
            ->join('users', 'users.id', '=', 'medecin_profiles.user_id')
            ->join('rendez_vous', 'rendez_vous.id', '=', 'consultations.rendez_vous_id')
            ->whereIn('consultations.medecin_profile_id', $profilIds);

        if (!empty($donnees['statut'])) {
            $requete->where('consultations.statut', $donnees['statut']);
        }

        if (!empty($donnees['from'])) {
            $fuseau = $donnees['timezone'] ?? config('app.timezone');
            $requete->whereBetween('consultations.started_at', [
                Carbon::parse($donnees['from'], $fuseau)->startOfDay()->setTimezone(config('app.timezone')),
                Carbon::parse($donnees['to'], $fuseau)->endOfDay()->setTimezone(config('app.timezone')),
            ]);
        }

        return $requete;
    }

    private function rechercher(Builder $requete, string $terme): Builder
    {
        if ($terme === '') {
            return $requete;
        }

        $motif = '%'.addcslashes($terme, '%_\\').'%';

        return $requete->where(fn (Builder $q) => $q
            ->where('users.name', 'like', $motif)
            ->orWhere('rendez_vous.name', 'like', $motif));
    }

    // [colonne SQL, sens] ; par défaut la date de création, la plus récente d'abord
    private function tri(array $donnees): array
    {
        $index = $donnees['order'][0]['column'] ?? null;
        $colonne = $index === null ? null : (self::TRI[$index] ?? null);

        if ($colonne === null) {
            return ['consultations.created_at', 'desc'];
        }

        return [$colonne, ($donnees['order'][0]['dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc'];
    }

    private function formater(Consultation $c): array
    {
        return [
            'id' => $c->id,
            'statut' => $c->statut,
            'created_at' => $c->created_at,
            'medecin' => [
                'id' => $c->medecin->user->id,
                'name' => $c->medecin->user->name,
                'specialite' => $c->medecin->specialite?->nom ?? 'Non spécifié',
            ],
            'patient' => ['nom' => $c->rendezVous->name],
            'rendez_vous' => [
                'date_debut' => $c->rendezVous->date_debut,
                'date_fin' => $c->rendezVous->date_fin,
            ],
            'heure_debut_reelle' => $c->heure_debut_reelle,
            'ended_at' => $c->ended_at,
            'ordonnance_decision' => $c->decisionOrdonnance(),
            'facture_decision' => $c->decisionFacture(),
            'facture_total' => $c->facture ? (float) $c->facture->total : null,
        ];
    }

    private function libelleOrdonnance(Consultation $c): string
    {
        return match ($c->decisionOrdonnance()) {
            Consultation::GENEREE => 'Oui',
            Consultation::NON_GENEREE => 'Sans ordonnance',
            default => 'Non',
        };
    }
}
