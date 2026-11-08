<?php

namespace App\Http\Controllers\Secretaire;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Secretaire\Concerns\MedecinsAccessibles;
use App\Services\ConsultationListeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    use MedecinsAccessibles;

    // Tableau DataTables (AJAX) des consultations des médecins accessibles
    public function datatable(Request $request, ConsultationListeService $liste): JsonResponse
    {
        $donnees = $request->validate(ConsultationListeService::REGLES);

        return response()->json($liste->tableau($this->profilIds($request, $donnees), $donnees));
    }

    // Le médecin choisi (s'il est accessible), sinon tous les médecins accessibles
    private function profilIds(Request $request, array $donnees): array
    {
        if (isset($donnees['medecin_id'])) {
            return [$this->profilMedecinAccessible($request->user(), (int) $donnees['medecin_id'])->id];
        }

        return $this->medecinProfileIdsAccessibles($request->user());
    }
}
