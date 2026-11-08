<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\MedecinProfile;
use App\Services\ConsultationListeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    // Tableau DataTables (AJAX) de toutes les consultations de l'application ; medecin_id = users.id
    public function datatable(Request $request, ConsultationListeService $liste): JsonResponse
    {
        $donnees = $request->validate(ConsultationListeService::REGLES);

        $profilIds = isset($donnees['medecin_id'])
            ? MedecinProfile::where('user_id', $donnees['medecin_id'])->pluck('id')->all()
            : null;

        return response()->json($liste->tableau($profilIds, $donnees));
    }
}
