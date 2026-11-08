<?php

namespace App\Http\Controllers\Directeur;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Directeur\Concerns\MedecinsAccessibles;
use App\Models\Consultation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConsultationController extends Controller
{
    use MedecinsAccessibles;

    /**
     * Consultations des médecins de l'hôpital (lecture seule), filtrables par statut et par médecin
     */
    public function index(Request $request): JsonResponse
    {
        $filtres = $request->validate([
            'statut' => ['nullable', Rule::in([Consultation::EN_COURS, Consultation::EN_ATTENTE, Consultation::ABANDONNEE, Consultation::TERMINEE])],
            'medecin_id' => ['nullable', 'integer'],
        ]);

        $profilIds = isset($filtres['medecin_id'])
            ? [$this->profilMedecinAccessible($request->user(), (int) $filtres['medecin_id'])->id]
            : $this->medecinProfileIdsAccessibles($request->user());

        $consultations = Consultation::whereIn('medecin_profile_id', $profilIds)
            ->with(['rendezVous', 'medecin.user', 'medecin.specialite', 'facture.lignes'])
            ->when(isset($filtres['statut']), fn ($q) => $q->where('statut', $filtres['statut']))
            ->orderByDesc('started_at')
            ->get();

        return response()->json([
            'consultations' => $consultations->map(fn (Consultation $c) => $this->formater($c))->values(),
        ]);
    }

    // Sans contenu médical (ordonnance, motif, coordonnées du patient) : indicateurs seulement
    private function formater(Consultation $c): array
    {
        return [
            'id' => $c->id,
            'statut' => $c->statut,
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
            'started_at' => $c->started_at,
            'heure_debut_reelle' => $c->heure_debut_reelle,
            'ended_at' => $c->ended_at,
            'ordonnance_decision' => $c->decisionOrdonnance(),
            'facture_decision' => $c->decisionFacture(),
            'facture_total' => $c->facture ? (float) $c->facture->total : null,
        ];
    }
}
