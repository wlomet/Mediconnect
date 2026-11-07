<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\RendezVous;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Compteurs du tableau de bord médecin
     */
    public function stats(Request $request)
    {
        $profil = $request->user()->medecinProfile;
        abort_unless($profil, 403);

        $rdvDuJour = RendezVous::where('medecin_id', $profil->id)
            ->whereIn('statut', ['en_attente', 'confirmé'])
            ->where('date_debut', '>=', now()->startOfDay())
            ->where('date_debut', '<', now()->addDay()->startOfDay());

        $aValider = RendezVous::where('medecin_id', $profil->id)
            ->where('statut', 'en_attente');

        return response()->json([
            'rendez_vous_aujourdhui' => (clone $rdvDuJour)->count(),
            'patients_en_attente' => (clone $rdvDuJour)->whereDoesntHave('consultation')->count(),
            'consultations_mois' => Consultation::where('medecin_profile_id', $profil->id)
                ->whereIn('statut', [Consultation::EN_COURS, Consultation::EN_ATTENTE, Consultation::TERMINEE])
                ->where('started_at', '>=', now()->startOfMonth())
                ->where('started_at', '<', now()->addMonth()->startOfMonth())
                ->count(),
            'rendez_vous_a_valider' => (clone $aValider)->count(),
            'rendez_vous_a_valider_plus_2_semaines' => (clone $aValider)
                ->where('date_debut', '>', now()->addWeeks(2))
                ->count(),
        ]);
    }
}
