<?php

namespace App\Http\Controllers;

use App\Models\Hopital;
use App\Models\SiteVisite;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class StatistiquesController extends Controller
{
    /**
     * Chiffres publics de la page vitrine « Statistiques ».
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'visiteurs_aujourdhui' => SiteVisite::where('jour', SiteVisite::aujourdhui())->count(),
            'comptes_clients' => User::role('client')->count(),
            'medecins_verifies_actifs' => User::role('medecin')
                ->where('isVerified', true)
                ->where('is_active', true)
                ->count(),
            'etablissements' => Hopital::where('hide', false)->count(),
        ]);
    }

    /**
     * Compte un visiteur une seule fois par jour (idempotent).
     */
    public function enregistrerVisite(Request $request): Response
    {
        $validated = $request->validate([
            'visiteur_id' => 'required|string|max:64|alpha_dash',
        ]);

        SiteVisite::insertOrIgnore([
            'jour' => SiteVisite::aujourdhui(),
            'visiteur_id' => $validated['visiteur_id'],
        ]);

        return response()->noContent();
    }
}
