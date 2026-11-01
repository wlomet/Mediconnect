<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Hopital;
use App\Models\MedecinProfile;

class ActeurController extends Controller
{
    /**
     * Établissements et médecins, pour les filtres et les attributions de modèles PDF.
     */
    public function index()
    {
        $hopitaux = Hopital::orderBy('name')->get(['id', 'name']);

        $medecins = MedecinProfile::with(['user:id,name', 'hopital:id,name'])
            ->get(['id', 'user_id', 'hopital_id'])
            ->filter(fn (MedecinProfile $profil) => $profil->user !== null)
            ->sortBy(fn (MedecinProfile $profil) => $profil->user->name)
            ->values()
            ->map(fn (MedecinProfile $profil) => [
                'id' => $profil->id,
                'name' => $profil->user->name,
                'hopital_id' => $profil->hopital_id,
                'hopital' => $profil->hopital?->name,
            ]);

        return response()->json([
            'hopitaux' => $hopitaux,
            'medecins' => $medecins,
        ]);
    }
}
